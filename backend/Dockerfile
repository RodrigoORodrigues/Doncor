FROM mcr.microsoft.com/playwright/python:v1.54.0-jammy

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir fastapi uvicorn playwright

EXPOSE 9000

CMD ["python", "-m", "uvicorn", "rpa_service_example:app", "--host", "0.0.0.0", "--port", "9000"]
