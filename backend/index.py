from fastapi import FastAPI, Response

try:
    from server import app
except Exception as e:
    import traceback
    error_trace = traceback.format_exc()
    
    # Create a fallback app to show the error
    app = FastAPI()
    
    @app.get("/{path:path}")
    def catch_all(path: str):
        return Response(content=f"CRITICAL STARTUP ERROR:\n\n{error_trace}", media_type="text/plain", status_code=500)

# This file is used by Vercel as the entry point for the Serverless Function
