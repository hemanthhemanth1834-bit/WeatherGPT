"""Optional WRF adapter interface. Original implementation.

A live WRF pipeline needs model infrastructure this project does not run,
so the adapter is OFF by default and reports NOT CONFIGURED unless a local
WRF output file is actually present. Production uses free GFS/Open-Meteo
NWP instead — never labelled as WRF.
"""
import os
from typing import Any, Dict


def wrf_status() -> Dict[str, Any]:
    """Describe WRF readiness without ever fabricating model output."""
    enabled = os.getenv("WRF_ENABLED", "false").lower() == "true"
    grib_path = os.getenv("WRF_GRIB_PATH", "")
    nc_path = os.getenv("WRF_NC_PATH", "")
    candidate = grib_path or nc_path
    file_present = bool(candidate) and os.path.isfile(candidate)
    if enabled and file_present:
        return {
            "status": "CONFIGURED (local file)",
            "path": candidate,
            "data_type": "Local WRF-ARW output (GRIB2/NetCDF)",
            "note": "File-based reads only. Parsing needs cfgrib/xarray/netCDF4, "
                    "installed separately when a feed is provisioned.",
        }
    return {
        "status": "NOT CONFIGURED",
        "path": candidate or None,
        "data_type": "None",
        "note": "No WRF infrastructure is running. GFS via Open-Meteo is the "
                "production NWP alternative and is never labelled WRF. "
                "To enable: set WRF_ENABLED=true plus WRF_GRIB_PATH or "
                "WRF_NC_PATH to a local WRF-ARW output file (see Dockerfile.wrf).",
    }
