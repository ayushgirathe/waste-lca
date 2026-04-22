"""
Blockchain Service for Waste LCA AI
Provides tamper-proof verification of waste analysis reports
"""

import hashlib
import json
import qrcode
from io import BytesIO
import base64
from datetime import datetime
from typing import Dict, Optional
import os

# For demonstration, we'll use a local "mock" blockchain
# In production, replace with actual blockchain (Ethereum, Polygon, etc.)

class BlockchainService:
    def __init__(self):
        # Mock blockchain storage (in production, use actual blockchain)
        self.mock_chain = []
        self.load_from_file()
    
    def load_from_file(self):
        """Load existing records from file"""
        try:
            with open('blockchain_records.json', 'r') as f:
                self.mock_chain = json.load(f)
        except FileNotFoundError:
            self.mock_chain = []
    
    def save_to_file(self):
        """Save records to file"""
        with open('blockchain_records.json', 'w') as f:
            json.dump(self.mock_chain, f, indent=2)
    
    def calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of a file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def calculate_content_hash(self, content: bytes) -> str:
        """Calculate SHA-256 hash of content"""
        return hashlib.sha256(content).hexdigest()
    
    def record_on_blockchain(self, file_hash: str, file_name: str, user_email: str, metadata: Dict = None) -> Dict:
        """Record a file hash on the blockchain"""
        
        # Create block
        block = {
            "block_id": len(self.mock_chain) + 1,
            "timestamp": datetime.now().isoformat(),
            "file_hash": file_hash,
            "file_name": file_name,
            "user_email": user_email,
            "metadata": metadata or {},
            "previous_hash": self.mock_chain[-1]["block_hash"] if self.mock_chain else "0" * 64
        }
        
        # Calculate block hash
        block_string = json.dumps(block, sort_keys=True)
        block["block_hash"] = hashlib.sha256(block_string.encode()).hexdigest()
        
        # Add to chain
        self.mock_chain.append(block)
        self.save_to_file()
        
        return {
            "success": True,
            "block_id": block["block_id"],
            "block_hash": block["block_hash"],
            "timestamp": block["timestamp"],
            "transaction_id": f"0x{block['block_hash'][:40]}"
        }
    
    def verify_document(self, file_hash: str) -> Dict:
        """Verify if a document hash exists on the blockchain"""
        for block in self.mock_chain:
            if block["file_hash"] == file_hash:
                return {
                    "verified": True,
                    "block_id": block["block_id"],
                    "timestamp": block["timestamp"],
                    "file_name": block["file_name"],
                    "user_email": block["user_email"],
                    "block_hash": block["block_hash"]
                }
        return {"verified": False}
    
    def get_all_records(self) -> list:
        """Get all blockchain records"""
        return self.mock_chain
    
    def generate_qr_code(self, file_hash: str, file_name: str) -> str:
        """Generate QR code for document verification"""
        verification_url = f"https://yourdomain.com/verify?hash={file_hash}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(verification_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64 for API response
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return img_str

# Singleton instance
blockchain_service = BlockchainService()