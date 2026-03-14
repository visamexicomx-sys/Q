"""SMM Automation Agent — Full-service social media marketing automation."""

from .core import SMMAgent
from .config import SMMConfig, load_config

__version__ = "1.0.0"
__all__ = ["SMMAgent", "SMMConfig", "load_config"]
