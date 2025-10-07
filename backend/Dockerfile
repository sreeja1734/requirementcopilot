FROM node:18

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-venv python3-pip build-essential

# Copy backend files
COPY . .

# Create a virtual environment
RUN python3 -m venv /opt/venv

# Activate virtual environment and install requirements
RUN /bin/bash -c "source /opt/venv/bin/activate && pip install --no-cache-dir -r requirements.txt"

# Make virtual environment Python default
ENV PATH="/opt/venv/bin:$PATH"

EXPOSE 5000

CMD ["sh", "-c", "python start_llm_service.py & node server.js"]
