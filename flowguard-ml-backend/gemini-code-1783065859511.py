from pydantic import BaseModel

# Define the expected structure for incoming chat queries
class ChatQuery(BaseModel):
    message: str

@app.post("/chat")
async def chat_with_sanitation_bot(query: ChatQuery):
    if not query.message.strip():
        raise HTTPException(status_code=400, detail="Query message cannot be empty.")
        
    try:
        # 1. Convert the user's plain text question into a vector embedding
        embedding_response = openai_client.embeddings.create(
            input=query.message,
            model="text-embedding-3-small"
        )
        query_vector = embedding_response.data[0].embedding
        
        # 2. Query the Supabase database using the custom 'match_documents' function we created
        # We pass the vector, a similarity threshold, and look for the top 3 most relevant matches
        db_response = supabase.rpc(
            "match_documents",
            {
                "query_embedding": query_vector,
                "match_count": 3
            }
        ).execute()
        
        # 3. Compile the matching text blocks into a single string context
        matched_records = db_response.data
        context_text = ""
        if matched_records:
            context_text = "\n---\n".join([record["content"] for record in matched_records])
        else:
            context_text = "No specific reference material found in database."

        # 4. Construct the prompt, forcing the LLM to ground its answers strictly in your PDF context
        system_prompt = (
            "You are the FlowGuard Sanitation & Safety AI Assistant. "
            "Your job is to assist facility managers and ground workers using the provided reference material.\n\n"
            f"Here is the relevant text extracted from the official protocols:\n{context_text}\n\n"
            "Answer the user's question professionally, relying strictly on the extracted protocols above. "
            "If the text does not contain the answer, tell them politely that the uploaded documentation "
            "does not cover this specific scenario."
        )
        
        # 5. Get the final answer from OpenAI
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query.message}
            ],
            temperature=0.2 # Lower temperature prevents the model from hallucinating non-existent protocols
        )
        
        bot_reply = completion.choices[0].message.content
        
        return {
            "status": "success",
            "reply": bot_reply
        }
        
    except Exception as e:
        print(f"Server Error during Chat RAG execution: {e}")
        raise HTTPException(status_code=500, detail="Failed to compute chat response.")