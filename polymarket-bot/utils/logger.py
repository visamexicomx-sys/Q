"""Logging setup with colored console output."""

import logging
import sys
from datetime import datetime

from colorama import Fore, Style, init

init(autoreset=True)


class ColoredFormatter(logging.Formatter):
    COLORS = {
        logging.DEBUG: Fore.CYAN,
        logging.INFO: Fore.GREEN,
        logging.WARNING: Fore.YELLOW,
        logging.ERROR: Fore.RED,
        logging.CRITICAL: Fore.RED + Style.BRIGHT,
    }

    def format(self, record):
        color = self.COLORS.get(record.levelno, "")
        timestamp = datetime.fromtimestamp(record.created).strftime("%H:%M:%S")
        return (
            f"{Fore.WHITE}{timestamp}{Style.RESET_ALL} "
            f"{color}{record.levelname:<8}{Style.RESET_ALL} "
            f"{Fore.CYAN}{record.name:<20}{Style.RESET_ALL} "
            f"{record.getMessage()}"
        )


def setup_logging(level: str = "INFO"):
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(ColoredFormatter())
    root.addHandler(console)

    # File handler
    file_handler = logging.FileHandler(
        f"bot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    )
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    root.addHandler(file_handler)

    # Quiet noisy libs
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
