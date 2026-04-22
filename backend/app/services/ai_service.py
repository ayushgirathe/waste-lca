"""
Complete AI/ML Service for Waste Material Analysis
- OCR text extraction
- LLM material identification
- RAG for incentives
- Material composition analysis
"""

import os
import re
import json
import base64
from typing import List, Dict, Any
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import ollama
from datetime import datetime

# Configure Tesseract path for Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

class WasteAIAnalyzer:
    """AI-powered waste material analyzer using OCR and LLM"""
    
    def __init__(self, model_name: str = "llama3.2:3b"):
        self.model_name = model_name
        self.ollama_client = ollama.Client()
        
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF using OCR"""
        try:
            print(f"📄 Processing PDF: {pdf_path}")
            images = convert_from_path(pdf_path, dpi=200)
            text = ""
            for i, img in enumerate(images):
                print(f"   Processing page {i+1}/{len(images)}")
                page_text = pytesseract.image_to_string(img, lang='eng')
                text += f"\n--- Page {i+1} ---\n{page_text}\n"
            return text
        except Exception as e:
            print(f"❌ PDF OCR error: {e}")
            return ""
    
    def extract_text_from_image(self, image_path: str) -> str:
        """Extract text from image using OCR"""
        try:
            print(f"🖼️ Processing image: {image_path}")
            img = Image.open(image_path)
            img = img.convert('L')
            text = pytesseract.image_to_string(img, lang='eng')
            return text
        except Exception as e:
            print(f"❌ Image OCR error: {e}")
            return ""
    
    def extract_materials_with_llm(self, text: str) -> List[Dict]:
        """Use LLM to extract materials and their percentages"""
        
        prompt = f"""
You are a waste material analyst expert. Analyze the following document and extract all recyclable materials.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no extra text.

Required JSON format:
[
  {{"name": "material_name", "percentage": number, "confidence": "high/medium/low"}},
  ...
]

Rules:
1. percentage MUST be a number (0-100). Use 0 if you cannot estimate.
2. NEVER use null or None for percentage - always use a number.
3. If percentage not mentioned, estimate based on typical composition
4. Use realistic percentages (they should add up to approximately 100%)
5. Common materials: copper, gold, silver, aluminum, plastic, steel, lithium, lead, zinc, tin
6. confidence: "high" if explicitly stated, "medium" if implied, "low" if estimated

Document text:
{text[:8000]}
"""
        
        try:
            print("🤖 Analyzing document with LLM...")
            response = self.ollama_client.chat(
                model=self.model_name,
                messages=[{'role': 'user', 'content': prompt}],
                options={'temperature': 0.1}
            )
            
            raw_response = response['message']['content']
            print(f"📝 LLM Response: {raw_response[:200]}...")
            
            # Extract JSON from response
            json_match = re.search(r'\[\s*\{.*\}\s*\]', raw_response, re.DOTALL)
            if json_match:
                materials = json.loads(json_match.group(0))
                # Ensure all materials have numeric percentages
                for material in materials:
                    if material.get('percentage') is None:
                        material['percentage'] = 0
                    if 'unit' in material:
                        del material['unit']
                return materials
            else:
                # Try to find any JSON-like structure
                json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
                if json_match:
                    materials = json.loads(json_match.group(0))
                    if isinstance(materials, dict):
                        materials = [materials]
                    return materials
            return []
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing error: {e}")
            return []
        except Exception as e:
            print(f"❌ LLM error: {e}")
            return []
    
    def calculate_recovery_value(self, materials: List[Dict], quantity_kg: float) -> Dict:
        """Calculate estimated recovery value based on market prices"""
        
        # Market prices (USD per kg) - from LME and industry sources
        market_prices = {
            "copper": 8.95,
            "gold": 58200,
            "silver": 740,
            "aluminum": 2.35,
            "steel": 0.52,
            "plastic": 0.35,
            "lithium": 12.50,
            "lead": 2.15,
            "zinc": 2.85,
            "tin": 28.50,
            "nickel": 16.50,
            "brass": 4.50,
            "bronze": 5.20,
            "magnesium": 3.80,
            "titanium": 11.00,
            "cobalt": 32.00,
            "rare_earth": 25.00
        }
        
        total_value = 0
        material_breakdown = []
        total_percentage_allocated = 0
        
        for material in materials:
            name = material.get('name', '').lower()
            percentage = material.get('percentage')
            
            # Skip if percentage is None or 0
            if percentage is None or percentage == 0:
                continue
                
            weight_kg = quantity_kg * (percentage / 100)
            price = market_prices.get(name, 1.0)
            value = weight_kg * price
            
            total_value += value
            total_percentage_allocated += percentage
            material_breakdown.append({
                'name': name,
                'percentage': percentage,
                'weight_kg': round(weight_kg, 2),
                'price_per_kg': price,
                'value_usd': round(value, 2)
            })
        
        if total_percentage_allocated == 0:
            return {
                'total_quantity_kg': quantity_kg,
                'total_recovery_value_usd': 0,
                'value_per_kg': 0,
                'materials': [],
                'warning': 'No valid material percentages found'
            }
        
        return {
            'total_quantity_kg': quantity_kg,
            'total_recovery_value_usd': round(total_value, 2),
            'value_per_kg': round(total_value / quantity_kg, 2),
            'total_percentage_analyzed': total_percentage_allocated,
            'materials': material_breakdown
        }
    
    def analyze_document(self, file_path: str, quantity_kg: float = 1000) -> Dict:
        """Complete document analysis pipeline"""
        
        print(f"\n🔍 Starting analysis of: {file_path}")
        
        # Step 1: Extract text based on file type
        if file_path.lower().endswith('.pdf'):
            text = self.extract_text_from_pdf(file_path)
        else:
            text = self.extract_text_from_image(file_path)
        
        if not text:
            return {
                'success': False,
                'error': 'Could not extract text from document',
                'materials': [],
                'recovery_value': None
            }
        
        # Step 2: Extract materials using LLM
        materials = self.extract_materials_with_llm(text)
        
        if not materials:
            return {
                'success': False,
                'error': 'Could not identify materials in document',
                'materials': [],
                'recovery_value': None
            }
        
        # Step 3: Calculate recovery value
        recovery = self.calculate_recovery_value(materials, quantity_kg)
        
        return {
            'success': True,
            'materials': materials,
            'recovery_value': recovery,
            'extracted_text_preview': text[:500]
        }


class RAGIncentiveAgent:
    """RAG-based agent for querying recycling incentives and regulations"""
    
    def __init__(self, model_name: str = "llama3.2:3b"):
        self.model_name = model_name
        self.ollama_client = ollama.Client()
        
        self.incentives_knowledge = """
        INDIA E-WASTE INCENTIVES:
        
        1. E-Waste Management Subsidy: ₹0.12 per kg of e-waste processed. 
           Eligibility: CPCB registered recyclers. Max annual: ₹5,00,000.
           Authority: Ministry of Environment.
        
        2. PLI Scheme for E-Waste: ₹0.08 per kg. 
           Eligibility: MSME recyclers. Max annual: ₹2,50,000.
           Authority: Ministry of Electronics & IT.
        
        3. Green Credit Program: ₹0.05 per kg.
           Eligibility: All registered recyclers.
           Authority: MoEFCC.
        
        INTERNATIONAL INCENTIVES:
        
        4. EU Green Deal Tax Credit: €0.23 per kg of recycled materials.
           Eligibility: EU certified facilities.
           Valid until: 2030.
        
        5. Singapore Zero Waste Grant: SGD 0.13 per kg.
           Eligibility: All recyclers in Singapore.
        """
    
    def query(self, question: str) -> str:
        """Query the RAG agent about recycling incentives"""
        
        prompt = f"""
You are a recycling policy expert. Answer questions based ONLY on the knowledge base below.

Knowledge Base:
{self.incentives_knowledge}

Question: {question}

Instructions:
- Be specific with amounts and eligibility criteria
- Mention the authority/governing body
- If the information is not in the knowledge base, say "I don't have information about that"

Answer:
"""
        
        try:
            response = self.ollama_client.chat(
                model=self.model_name,
                messages=[{'role': 'user', 'content': prompt}],
                options={'temperature': 0.3}
            )
            return response['message']['content']
        except Exception as e:
            return f"Error querying agent: {e}"


# Singleton instances
ai_analyzer = WasteAIAnalyzer()
rag_agent = RAGIncentiveAgent()