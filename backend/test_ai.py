from app.services.ai_service import ai_analyzer, rag_agent

# Test material extraction
print("=" * 50)
print("Testing Material Extraction")
print("=" * 50)

# Sample text for testing
sample_text = """
Waste analysis report:
- Copper: 15%
- Gold: 0.5%
- Plastic: 25%
- Steel: 40%
- Other: 19.5%
"""

materials = ai_analyzer.extract_materials_with_llm(sample_text)
print(f"Extracted materials: {materials}")

# Test recovery value calculation
print("\n" + "=" * 50)
print("Testing Recovery Value Calculation")
print("=" * 50)

recovery = ai_analyzer.calculate_recovery_value(materials, 1000)
print(f"Total recovery value: ${recovery['total_recovery_value_usd']:.2f}")

# Test RAG agent
print("\n" + "=" * 50)
print("Testing RAG Agent")
print("=" * 50)

response = rag_agent.query("What e-waste incentives are available in India?")
print(f"Answer: {response}")