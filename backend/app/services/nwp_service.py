"""NWP (GFS/WRF) integration interface (SIH 2026 addition).

Status policy: never claim live GFS/WRF ingestion unless actually configured.
- GFS: LIVE via Open-Meteo global NWP blend (clearly labelled, API-DEPENDENT).
- WRF: NOT CONFIGURED in this environment (interface ready, needs GRIB/NetCDF pipeline).
"""
from typing import Dict, Any

from .wrf_adapter import wrf_status


def get_nwp_status() -> Dict[str, Any]:
    wrf = wrf_status()
    return {
        "integration": "READY",
        "gfs": {
            "status": "LIVE",
            "provider": "Open-Meteo (GFS + ICON + ECMWF blend; explicit GFS via ?model=gfs)",
            "data_type": "Forecast",
            "notes": "Current forecast values in this app are served from this live NWP blend.",
        },
        "wrf": {
            "status": wrf["status"],
            "expected_inputs": ["GRIB2 via NOMADS", "NetCDF via local WRF-ARW output"],
            "configured_path": wrf["path"],
            "adapter_note": wrf["note"],
            "parser_architecture": (
                "Ready interface: cfgrib/xarray ingestion -> subset by lat/lon box -> "
                "extract T2m/RH/wind/precip -> cache -> serve via /api/nwp/forecast. "
                "Dependencies (cfgrib, eccodes, xarray, netCDF4) are intentionally NOT "
                "installed until a WRF feed is provisioned."
            ),
        },
        "disclaimer": "GFS-blend values are provider/model dependent. WRF is not active until configured.",
    }
