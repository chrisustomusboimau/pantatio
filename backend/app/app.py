import datetime
import random
import httpx

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from .schema import (
    ChatRequest, ChatResponse,
    WeatherMacroResponse, WeatherAlertResponse,
    Plant, ScannedItem, PlantCreate,
    IotNode, IotNodeCreate,
    TacticalLog, EuroSatAnalysisResponse,
)
from .db import (
    get_db, init_seed_data,
    ChatLog, WeatherLog,
    PlantDB, ScannedItemDB, ProbeDataDB, TimelineEventDB,
    IotNodeDB, TacticalLogDB, SatelliteAnalysisLogDB,
)

# ── Konfigurasi Eksternal ──────────────────────────────────────────────────────

# Koordinat default kawasan restorasi (Jakarta)
LOCATION_LAT = -6.1754
LOCATION_LON = 106.8272
LOCATION_NAME = "Kawasan Restorasi, Jakarta"

# URL layanan ML satellite (ganti sesuai endpoint Anda)
ML_SERVICE_URL = "http://localhost:8001/predict"
CHATBOT_SERVICE_URL = "http://localhost:8002/chat"

# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(title="Cognitive Assistant API")


@app.on_event("startup")
def on_startup():
    init_seed_data()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ────────────────────────────────────────────────────────────────────

# Mapping kode WMO → label kondisi cuaca (Open-Meteo)
WMO_CONDITION: dict[int, tuple[str, str]] = {
    0:  ("Cerah",           "sun"),
    1:  ("Sebagian Berawan","cloud-sun"),
    2:  ("Berawan",         "cloud"),
    3:  ("Mendung",         "cloud"),
    45: ("Berkabut",        "cloud"),
    48: ("Berkabut Beku",   "cloud"),
    51: ("Gerimis Ringan",  "cloud-drizzle"),
    53: ("Gerimis",         "cloud-drizzle"),
    55: ("Gerimis Lebat",   "cloud-drizzle"),
    61: ("Hujan Ringan",    "rain"),
    63: ("Hujan Sedang",    "rain"),
    65: ("Hujan Lebat",     "rain"),
    80: ("Hujan Lokal",     "rain"),
    81: ("Hujan Lebat",     "rain"),
    95: ("Badai Petir",     "storm"),
    99: ("Badai + Hujan Es","storm"),
}

DAY_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

ALERT_THRESHOLDS = {
    "heat":   ("Peringatan Cekaman Panas (Heat Stress)",
               "Suhu makro melebihi ambang batas adaptasi tanaman muda. "
               "Sistem AI menyarankan pengaktifan naungan."),
    "rain":   ("Peringatan Curah Hujan Tinggi",
               "Curah hujan tinggi diprediksi. Tunda pemupukan dan periksa drainase lahan."),
    "normal": ("Kondisi Cuaca Normal",
               "Tidak ada peringatan cuaca saat ini. Lanjutkan rutinitas perawatan."),
}


async def fetch_open_meteo() -> dict:
    """
    Ambil data cuaca real-time dan forecast 5 hari dari Open-Meteo.
    Raise HTTPException jika gagal agar caller bisa handle.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude":            LOCATION_LAT,
        "longitude":           LOCATION_LON,
        "current":             "temperature_2m,relative_humidity_2m,weathercode",
        "daily":               "weathercode,temperature_2m_max",
        "timezone":            "Asia/Jakarta",
        "forecast_days":       6,   # hari ini + 5 hari ke depan
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, params=params)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Open-Meteo error: {resp.status_code} {resp.text[:200]}"
        )
    return resp.json()


# ── Weather Endpoints ──────────────────────────────────────────────────────────

@app.get("/api/v1/weather/macro", response_model=WeatherMacroResponse)
async def get_weather_macro(db: Session = Depends(get_db)):
    data = await fetch_open_meteo()

    current   = data["current"]
    daily     = data["daily"]

    temp_c    = round(current["temperature_2m"])
    humidity  = current["relative_humidity_2m"]
    wmo_now   = current["weathercode"]
    condition, _ = WMO_CONDITION.get(wmo_now, ("Tidak Diketahui", "cloud"))

    # Forecast hari ke-1 s/d 5 (index 0 = hari ini, skip)
    forecast = []
    for i in range(1, 6):
        date_str = daily["time"][i]                        # "2025-10-15"
        dow      = datetime.date.fromisoformat(date_str).weekday()  # 0=Mon
        dow_id   = DAY_ID[(dow + 1) % 7]                  # Senin=Sen, dst.
        wmo_d    = daily["weathercode"][i]
        _, icon  = WMO_CONDITION.get(wmo_d, ("Berawan", "cloud"))
        t_max    = round(daily["temperature_2m_max"][i])
        forecast.append({"day": dow_id, "icon": icon, "temp_c": t_max})

    # Simpan ke DB
    db.add(WeatherLog(
        city=LOCATION_NAME,
        tempC=float(temp_c),
        condition=condition,
    ))
    db.commit()

    return WeatherMacroResponse(
        city=LOCATION_NAME,
        temp_c=temp_c,
        condition=condition,
        humidity=humidity,
        forecast=forecast,
    )


@app.get("/api/v1/weather/alert", response_model=WeatherAlertResponse)
async def get_weather_alert():
    """
    Baca data cuaca terbaru dari DB (hasil polling /macro),
    lalu tentukan alert yang sesuai.
    """
    # Gunakan Open-Meteo langsung agar alert selalu segar
    data = await fetch_open_meteo()

    current  = data["current"]
    daily    = data["daily"]
    temp_c   = current["temperature_2m"]

    # Cek apakah ada hujan berat dalam 3 hari ke depan (wmo >= 61)
    rain_soon = any(
        daily["weathercode"][i] >= 61 for i in range(1, min(4, len(daily["weathercode"])))
    )

    if temp_c >= 35:
        key = "heat"
    elif rain_soon:
        key = "rain"
    else:
        key = "normal"

    title, body = ALERT_THRESHOLDS[key]
    return WeatherAlertResponse(title=title, body=body)


# ── Chat Endpoint ──────────────────────────────────────────────────────────────

# ✅ SESUDAH
@app.post("/api/b2c/chat", response_model=ChatResponse)
async def chat_b2c(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Endpoint chat B2C — meneruskan pesan user ke chatbot eksternal.
    Jika chatbot tidak tersedia, fallback ke keyword matching lokal.
    """
    # Ambil teks dari dua format yang mungkin masuk:
    # - Frontend baru kirim { "text": "..." }
    # - Atau format messages: [{ "role": "user", "content": "..." }]
    if request.text:
        user_text = request.text
    elif request.messages:
        user_text = request.messages[-1].content
    else:
        user_text = ""

    bot_reply = ""
    bot_tags  = []

    # ── Coba panggil chatbot eksternal ──────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                CHATBOT_SERVICE_URL,
                json={"text": user_text},   # sesuaikan body jika endpoint Anda berbeda
            )
            resp.raise_for_status()
            result = resp.json()

        # Ambil reply & tags dari respons chatbot
        # Sesuaikan key-nya dengan format respons chatbot Anda
        bot_reply = result.get("text") or result.get("reply") or result.get("response", "")
        bot_tags  = result.get("tags", [])

    # ── Fallback: keyword matching lokal jika chatbot tidak tersedia ────────
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        lower_text = user_text.lower()

        if any(k in lower_text for k in ["siram", "water", "kelembab"]):
            bot_reply = (
                "Kelembapan tanah berada di tingkat optimal. "
                "Anda tidak perlu menyiramnya hari ini."
            )
            bot_tags = ["Moisture OK", "No action needed"]

        elif any(k in lower_text for k in ["gambar", "kamera", "foto", "visual"]):
            bot_reply = (
                "Berdasarkan analisis visual, daun terlihat sehat dengan warna merata. "
                "Tidak ada tanda hama terdeteksi. Lanjutkan rutinitas saat ini! ✨"
            )
            bot_tags = ["Visual OK", "No pest detected"]

        elif any(k in lower_text for k in ["pupuk", "nutrisi", "fertiliz"]):
            bot_reply = (
                "Kadar nutrisi tanaman masih dalam batas aman. "
                "Jadwal pemupukan berikutnya disarankan 3 hari lagi."
            )
            bot_tags = ["Nutrients stable", "Schedule updated"]

        elif any(k in lower_text for k in ["cuaca", "hujan", "panas", "weather"]):
            bot_reply = (
                "Berdasarkan prakiraan cuaca terkini, suhu hari ini sekitar 32°C. "
                "Pantau sistem irigasi jika suhu melebihi 35°C."
            )
            bot_tags = ["Weather checked", "Monitor irrigation"]

        elif any(k in lower_text for k in ["hama", "penyakit", "pest", "disease"]):
            bot_reply = (
                "Tidak ada laporan hama aktif di zona Anda. "
                "Lakukan inspeksi visual mingguan untuk pencegahan dini."
            )
            bot_tags = ["No pest alert", "Inspection reminder"]

        else:
            bot_reply = (
                "Got it. I've cross-checked your plant against 12k similar cases. "
                "Adjusting your care plan now."
            )
            bot_tags = ["Plan updated", "Confidence: 88%"]

    # ── Simpan ke DB & return ────────────────────────────────────────────────
    db.add(ChatLog(
        plant_id=request.plant_id,
        user_message=user_text,
        bot_response=bot_reply,
    ))
    db.commit()

    return ChatResponse(role="assistant", text=bot_reply, tags=bot_tags)


@app.post("/api/plants/{plant_id}/chat", response_model=ChatResponse)
async def chat_by_plant(
    request: ChatRequest,
    plant_id: int,
    db: Session = Depends(get_db),
):
    """Alias endpoint chat dengan plant_id di path — delegate ke logika yang sama."""
    request.plant_id = plant_id
    return await chat_b2c(request, db)


# ── Plant Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/plants", response_model=List[Plant])
async def get_all_plants(db: Session = Depends(get_db)):
    return db.query(PlantDB).all()


@app.get("/api/plants/{plant_id}", response_model=Plant)
async def get_plant(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(PlantDB).filter(PlantDB.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Tanaman tidak ditemukan")
    return plant


@app.post("/api/plants", response_model=Plant)
async def create_plant(plant_req: PlantCreate, db: Session = Depends(get_db)):
    new_plant = PlantDB(
        nickname=plant_req.nickname,
        species=plant_req.species,
        image=plant_req.image,
        health=100.0,
        days_planted=1,
    )
    db.add(new_plant)
    db.commit()
    db.refresh(new_plant)

    db.add(ProbeDataDB(
        plant_id=new_plant.id,
        moisture=50.0, nutrients=50.0, light=50.0, temperature=24.0,
    ))

    today = datetime.datetime.now().strftime("%d %b")
    db.add(TimelineEventDB(
        plant_id=new_plant.id,
        date=today,
        event="Terdaftar",
        note="Ditambahkan via Plantatio Scanner",
    ))

    db.commit()
    db.refresh(new_plant)
    return new_plant


@app.post("/api/plants/{plant_id}/scan", response_model=Plant)
async def scan_item(plant_id: int, item: ScannedItem, db: Session = Depends(get_db)):
    plant = db.query(PlantDB).filter(PlantDB.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Tanaman tidak ditemukan")

    # Hapus item lama dengan kategori sama (hindari duplikasi)
    db.query(ScannedItemDB).filter(
        ScannedItemDB.plant_id == plant_id,
        ScannedItemDB.category == item.category,
    ).delete()

    db.add(ScannedItemDB(
        id=item.id,
        plant_id=plant_id,
        category=item.category,
        name=item.name,
        brand=item.brand,
        sensor_id=item.sensor_id,
        seed_variety=item.seed_variety,
        germination_days=item.germination_days,
        soil_type=item.soil_type,
        ph_level=item.ph_level,
        npk_ratio=item.npk_ratio,
        application_frequency=item.application_frequency,
        description=item.description,
        scanned_at=item.scanned_at,
    ))

    # Update probe jika yang di-scan sensor
    if item.category == "sensor" and plant.probe:
        plant.probe.moisture    = 72.0
        plant.probe.nutrients   = 68.0
        plant.probe.light       = 85.0
        plant.probe.temperature = 24.0

    event_labels = {
        "sensor":     "Sensor dipasang",
        "seed":       "Bibit dikonfirmasi",
        "soil":       "Media tanam diganti",
        "fertilizer": "Pupuk ditambahkan",
        "other":      "Konteks diperbarui",
    }
    today = datetime.datetime.now().strftime("%d %b")
    db.add(TimelineEventDB(
        plant_id=plant_id,
        date=today,
        event=event_labels.get(item.category, "Item ditambahkan"),
        note=f"{item.name} ({item.brand or ''}) tersinkron ke AI",
        scan_category=item.category,
    ))

    db.commit()
    db.refresh(plant)
    return plant


@app.delete("/api/plants/{plant_id}")
async def delete_plant(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(PlantDB).filter(PlantDB.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Tanaman tidak ditemukan")
    db.delete(plant)
    db.commit()
    return {"message": "Tanaman berhasil dihapus"}


# ── Device Manager B2B Endpoints ──────────────────────────────────────────────

@app.get("/api/b2b/devices", response_model=List[IotNode])
async def get_devices(db: Session = Depends(get_db)):
    return db.query(IotNodeDB).all()


@app.post("/api/b2b/devices", response_model=IotNode)
async def create_device(node: IotNodeCreate, db: Session = Depends(get_db)):
    # Pastikan ID unik dengan retry singkat
    for _ in range(5):
        new_id = f"NODE-{random.randint(1000, 9999)}"
        if not db.query(IotNodeDB).filter(IotNodeDB.id == new_id).first():
            break

    new_node = IotNodeDB(
        id=new_id,
        zone=node.zone,
        battery=100,
        moisture=random.randint(40, 80),
        status="ok",
        latitude=node.latitude,
        longitude=node.longitude,
    )
    db.add(new_node)
    db.commit()
    db.refresh(new_node)
    return new_node


@app.post("/api/b2b/devices/{node_id}/diagnose")
async def diagnose_device(node_id: str, db: Session = Depends(get_db)):
    node = db.query(IotNodeDB).filter(IotNodeDB.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} tidak ditemukan")

    # Tentukan hasil diagnostik berdasarkan data nyata dari DB
    issues = []
    if node.battery < 20:
        issues.append(f"Baterai kritis: {node.battery}%")
    if node.moisture < 30:
        issues.append(f"Kelembaban sangat rendah: {node.moisture}%")
    if node.status == "critical":
        issues.append("Status node: CRITICAL — periksa koneksi fisik")
    elif node.status == "warn":
        issues.append("Status node: WARNING — perlu perhatian")

    result = "OK — tidak ada masalah terdeteksi" if not issues else "; ".join(issues)

    # Catat ke tactical log
    severity = "info" if not issues else ("critical" if node.status == "critical" else "warn")
    now_str  = datetime.datetime.now().strftime("%H:%M")
    db.add(TacticalLogDB(
        time=now_str,
        action=f"Diagnostics {node_id}: {result}",
        severity=severity,
    ))
    db.commit()

    return {
        "node_id":  node_id,
        "zone":     node.zone,
        "battery":  node.battery,
        "moisture": node.moisture,
        "status":   node.status,
        "issues":   issues,
        "result":   result,
    }


@app.post("/api/b2b/procurement")
async def order_probes(db: Session = Depends(get_db)):
    # Hitung node yang butuh penggantian (baterai < 20 atau status critical)
    critical_nodes = db.query(IotNodeDB).filter(
        (IotNodeDB.battery < 20) | (IotNodeDB.status == "critical")
    ).all()

    qty = max(len(critical_nodes), 1)   # minimal order 1 unit

    now_str = datetime.datetime.now().strftime("%H:%M")
    db.add(TacticalLogDB(
        time=now_str,
        action=f"Procurement order: {qty} probe unit(s) — triggered by {len(critical_nodes)} critical node(s)",
        severity="info",
    ))
    db.commit()

    return {
        "message":        "Order placed successfully",
        "quantity":       qty,
        "critical_nodes": [n.id for n in critical_nodes],
    }


@app.post("/api/b2b/maintenance")
async def request_maintenance(db: Session = Depends(get_db)):
    # Kumpulkan semua node yang butuh maintenance
    warn_nodes = db.query(IotNodeDB).filter(
        IotNodeDB.status.in_(["warn", "critical"])
    ).all()

    now_str = datetime.datetime.now().strftime("%H:%M")
    db.add(TacticalLogDB(
        time=now_str,
        action=f"Maintenance ticket created for {len(warn_nodes)} node(s): "
               + ", ".join(n.id for n in warn_nodes),
        severity="warn" if warn_nodes else "info",
    ))
    db.commit()

    return {
        "message":     "Maintenance ticket created",
        "nodes_flagged": [{"id": n.id, "zone": n.zone, "status": n.status} for n in warn_nodes],
    }


@app.get("/api/b2b/agents/log", response_model=List[TacticalLog])
async def get_tactical_logs(db: Session = Depends(get_db)):
    logs = db.query(TacticalLogDB).order_by(TacticalLogDB.id.desc()).limit(10).all()
    if not logs:
        # Fallback hanya jika DB benar-benar kosong (seed belum jalan)
        return [
            TacticalLog(id=1, time="10:42", action="Auto-adjust irrigation Sektor B", severity="info"),
            TacticalLog(id=2, time="11:15", action="Flagged NODE-2199 battery low",   severity="warn"),
        ]
    return logs


# ── Satellite Analysis ─────────────────────────────────────────────────────────

@app.post("/api/b2b/satellite/analyze", response_model=EuroSatAnalysisResponse)
async def analyze_satellite_images(
    pre_restoration: UploadFile = File(...),
    current_state:   UploadFile = File(...),
):
    """
    Forward kedua file ke ML service, simpan hasilnya ke DB,
    lalu kembalikan ke frontend.
    """
    pre_bytes  = await pre_restoration.read()
    curr_bytes = await current_state.read()

    # Kirim ke ML endpoint eksternal
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            ml_resp = await client.post(
                ML_SERVICE_URL,
                files={
                    "pre_restoration": (pre_restoration.filename,  pre_bytes,  pre_restoration.content_type),
                    "current_state":   (current_state.filename,    curr_bytes, current_state.content_type),
                },
            )
            ml_resp.raise_for_status()
            ml_data = ml_resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"ML service error: {e.response.text[:300]}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"ML service unreachable: {str(e)}")

    labels = ml_data.get("labels", {})

    # Simpan hasil ke DB
    from sqlalchemy.orm import Session as _S   # local import agar tidak circular
    from .db import SessionLocal
    db: _S = SessionLocal()
    try:
        db.add(SatelliteAnalysisLogDB(
            image_path=          ml_data.get("image_path", current_state.filename),
            class_name=          ml_data.get("class_name", "Unknown"),
            vegetation_density=  labels.get("vegetation_density"),
            canopy_cover=        labels.get("canopy_cover"),
            est_biomass=         labels.get("est_biomass"),
            carbon_eq=           labels.get("carbon_EQ"),
            restoration_quality= labels.get("restoration_quality"),
            confidence=          labels.get("confidence"),
        ))
        db.commit()
    finally:
        db.close()

    return EuroSatAnalysisResponse(**ml_data)