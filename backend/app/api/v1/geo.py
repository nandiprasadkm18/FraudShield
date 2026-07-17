from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.session import get_db
from app.models.domain import (
    GovStateCybercrime,
    GovDistrictCybercrime,
    GovCityCybercrime,
    StateFinancialImpact,
    CityCoordinates,
    DistrictCoordinates,
)

router = APIRouter()

# Static state coordinate lookup (used when DB doesn't have a coordinates table for states)
_STATE_COORDS: dict[str, tuple[float, float]] = {
    "Andhra Pradesh": (15.9129, 79.7400),
    "Arunachal Pradesh": (28.2180, 94.7278),
    "Assam": (26.2006, 92.9376),
    "Bihar": (25.0961, 85.3131),
    "Chhattisgarh": (21.2787, 81.8661),
    "Goa": (15.2993, 74.1240),
    "Gujarat": (22.2587, 71.1924),
    "Haryana": (29.0588, 76.0856),
    "Himachal Pradesh": (31.1048, 77.1734),
    "Jharkhand": (23.6102, 85.2799),
    "Karnataka": (15.3173, 75.7139),
    "Kerala": (10.8505, 76.2711),
    "Madhya Pradesh": (22.9734, 78.6569),
    "Maharashtra": (19.7515, 75.7139),
    "Manipur": (24.6637, 93.9063),
    "Meghalaya": (25.4670, 91.3662),
    "Mizoram": (23.1645, 92.9376),
    "Nagaland": (26.1584, 94.5624),
    "Odisha": (20.9517, 85.0985),
    "Punjab": (31.1471, 75.3412),
    "Rajasthan": (27.0238, 74.2179),
    "Sikkim": (27.5330, 88.5122),
    "Tamil Nadu": (11.1271, 78.6569),
    "Telangana": (18.1124, 79.0193),
    "Tripura": (23.9408, 91.9882),
    "Uttar Pradesh": (26.8467, 80.9462),
    "Uttarakhand": (30.0668, 79.0193),
    "West Bengal": (22.9868, 87.8550),
    "Delhi": (28.7041, 77.1025),
    "Jammu & Kashmir": (33.7782, 76.5762),
    "Ladakh": (34.1526, 77.5771),
    "Chandigarh": (30.7333, 76.7794),
    "Puducherry": (11.9416, 79.8083),
}


@router.get("/districts")
async def get_districts(db: AsyncSession = Depends(get_db)):
    # Join district crime data with coordinate table
    result = await db.execute(
        select(
            GovDistrictCybercrime.district,
            GovDistrictCybercrime.state,
            GovDistrictCybercrime.crimeCount,
            DistrictCoordinates.lat,
            DistrictCoordinates.lng,
        ).join(
            DistrictCoordinates,
            (GovDistrictCybercrime.district == DistrictCoordinates.name)
            & (GovDistrictCybercrime.state == DistrictCoordinates.state),
            isouter=True,
        ).order_by(GovDistrictCybercrime.crimeCount.desc()).limit(200)
    )
    rows = result.all()
    return [
        {
            "district": r.district,
            "state": r.state,
            "cases": r.crimeCount,
            "lat": r.lat,
            "lng": r.lng,
        }
        for r in rows
        if r.lat is not None
    ]


@router.get("/cities")
async def get_cities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            GovCityCybercrime.city,
            GovCityCybercrime.state,
            GovCityCybercrime.crimeCount,
            CityCoordinates.lat,
            CityCoordinates.lng,
        ).join(
            CityCoordinates,
            (GovCityCybercrime.city == CityCoordinates.name)
            & (GovCityCybercrime.state == CityCoordinates.state),
            isouter=True,
        ).order_by(GovCityCybercrime.crimeCount.desc()).limit(200)
    )
    rows = result.all()
    return [
        {
            "city": r.city,
            "state": r.state,
            "cases": r.crimeCount,
            "lat": r.lat,
            "lng": r.lng,
        }
        for r in rows
        if r.lat is not None
    ]


@router.get("/states")
async def get_states(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GovStateCybercrime).order_by(GovStateCybercrime.crimeCount.desc())
    )
    rows = result.scalars().all()
    out = []
    for r in rows:
        coords = _STATE_COORDS.get(r.state)
        if not coords:
            continue
        out.append({
            "state": r.state,
            "cases": r.crimeCount,
            "lat": coords[0],
            "lng": coords[1],
            "metadata": r.metadata_ or {},
        })
    return out


@router.get("/financial")
async def get_financial(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StateFinancialImpact).order_by(StateFinancialImpact.amountReported.desc())
    )
    rows = result.scalars().all()
    out = []
    for r in rows:
        coords = _STATE_COORDS.get(r.state)
        if not coords:
            continue
        out.append({
            "state": r.state,
            "totalIncidents": r.totalIncidents,
            "amountReported": r.amountReported,
            "lienAmount": r.lienAmount,
            "refundedAmount": r.refundedAmount,
            "lat": coords[0],
            "lng": coords[1],
        })
    return out
