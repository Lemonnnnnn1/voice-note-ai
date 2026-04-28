"""Auto cleanup service using APScheduler."""
import os
import asyncio
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class CleanupService:
    """Service for automatic cleanup of old audio files."""

    def __init__(self):
        self._scheduler = None
        self._job_id = "auto_cleanup_task"

    def _get_scheduler(self):
        """Lazy load APScheduler."""
        if self._scheduler is None:
            try:
                from apscheduler.schedulers.asyncio import AsyncIOScheduler
                self._scheduler = AsyncIOScheduler()
            except ImportError:
                logger.warning("APScheduler not installed. Auto cleanup will not be available.")
                raise ImportError("pip install apscheduler")
        return self._scheduler

    async def _cleanup_old_files(self, storage_path: str, days: int):
        """
        Delete audio files older than specified days.

        Args:
            storage_path: Path to the storage directory
            days: Number of days to retain files
        """
        if not os.path.exists(storage_path):
            logger.warning(f"Storage path does not exist: {storage_path}")
            return

        cutoff_date = datetime.now() - timedelta(days=days)
        deleted_count = 0
        deleted_size = 0

        try:
            for filename in os.listdir(storage_path):
                file_path = os.path.join(storage_path, filename)
                if os.path.isfile(file_path):
                    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                    if file_mtime < cutoff_date:
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        deleted_count += 1
                        deleted_size += file_size
                        logger.info(f"Deleted old file: {filename}")

            if deleted_count > 0:
                logger.info(f"Cleanup complete: {deleted_count} files deleted, {deleted_size / 1024 / 1024:.2f} MB freed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

    def start_auto_cleanup(self, storage_path: str, days: int):
        """
        Start the automatic cleanup job.

        Args:
            storage_path: Path to the storage directory
            days: Number of days to retain files
        """
        try:
            scheduler = self._get_scheduler()

            # Remove existing job if any
            if self._scheduler.get_job(self._job_id):
                self._scheduler.remove_job(self._job_id)

            # Add new job - run daily at midnight
            from apscheduler.triggers.cron import CronTrigger
            self._scheduler.add_job(
                self._cleanup_old_files,
                trigger=CronTrigger(hour=0, minute=0),
                args=[storage_path, days],
                id=self._job_id,
                replace_existing=True
            )

            if not self._scheduler.running:
                self._scheduler.start()

            logger.info(f"Auto cleanup started: storage_path={storage_path}, retain_days={days}")
        except ImportError:
            logger.warning("Cannot start auto cleanup: APScheduler not installed")

    def stop_auto_cleanup(self):
        """Stop the automatic cleanup job."""
        if self._scheduler and self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            self._scheduler = None
            logger.info("Auto cleanup stopped")

    def update_cleanup_settings(self, storage_path: str, days: int, enabled: bool):
        """
        Update cleanup settings.

        Args:
            storage_path: Path to the storage directory
            days: Number of days to retain files
            enabled: Whether auto cleanup is enabled
        """
        if enabled:
            self.start_auto_cleanup(storage_path, days)
        else:
            self.stop_auto_cleanup()


# Singleton instance
cleanup_service = CleanupService()