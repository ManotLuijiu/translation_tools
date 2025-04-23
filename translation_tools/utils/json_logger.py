import logging
import os
import json
from frappe.utils import get_bench_path


class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "pathname": record.pathname,
            "lineno": record.lineno,
        }

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record)


def get_json_logger(
    name: str = "translation_tools",
    log_filename: str = "translation_debug.log",
    console: bool = False,
) -> logging.Logger:
    log_dir = os.path.join(get_bench_path(), "logs", name)
    os.makedirs(log_dir, exist_ok=True)

    log_path = os.path.join(log_dir, log_filename)
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    if not logger.handlers:
        file_handler = logging.FileHandler(log_path)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(JSONFormatter())
        logger.addHandler(file_handler)

        if console:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.INFO)
            console_handler.setFormatter(JSONFormatter())
            logger.addHandler(console_handler)

    return logger
