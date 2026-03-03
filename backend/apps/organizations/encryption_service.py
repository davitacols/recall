from cryptography.fernet import Fernet
from django.conf import settings
import base64
import hashlib
import logging

logger = logging.getLogger(__name__)


class EncryptionService:
    """Service for encrypting sensitive data at rest"""
    PREFIX = "enc::"
    
    @staticmethod
    def get_key():
        """Generate encryption key from SECRET_KEY"""
        key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        return base64.urlsafe_b64encode(key)
    
    @staticmethod
    def encrypt(data: str) -> str:
        """Encrypt string data"""
        if not data:
            return data
        if isinstance(data, str) and data.startswith(EncryptionService.PREFIX):
            return data
        
        try:
            f = Fernet(EncryptionService.get_key())
            encrypted = f.encrypt(data.encode())
            return EncryptionService.PREFIX + base64.urlsafe_b64encode(encrypted).decode()
        except Exception:
            logger.exception("Encryption failed")
            return data
    
    @staticmethod
    def decrypt(encrypted_data: str) -> str:
        """Decrypt string data"""
        if not encrypted_data:
            return encrypted_data
        if not isinstance(encrypted_data, str) or not encrypted_data.startswith(EncryptionService.PREFIX):
            return encrypted_data
        
        try:
            payload = encrypted_data[len(EncryptionService.PREFIX):]
            f = Fernet(EncryptionService.get_key())
            decoded = base64.urlsafe_b64decode(payload.encode())
            decrypted = f.decrypt(decoded)
            return decrypted.decode()
        except Exception:
            logger.exception("Decryption failed")
            return encrypted_data
    
    @staticmethod
    def encrypt_file(file_data: bytes) -> bytes:
        """Encrypt file data"""
        if not file_data:
            return file_data
        
        try:
            f = Fernet(EncryptionService.get_key())
            return f.encrypt(file_data)
        except Exception:
            logger.exception("File encryption failed")
            return file_data
    
    @staticmethod
    def decrypt_file(encrypted_data: bytes) -> bytes:
        """Decrypt file data"""
        if not encrypted_data:
            return encrypted_data
        
        try:
            f = Fernet(EncryptionService.get_key())
            return f.decrypt(encrypted_data)
        except Exception:
            logger.exception("File decryption failed")
            return encrypted_data
