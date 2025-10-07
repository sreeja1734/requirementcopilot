# Use official Node.js 18 image
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# Install dependencies with legacy-peer-deps to avoid React version conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the project files
COPY . .

# Expose the port the React app runs on
EXPOSE 3000

# Start the React app
CMD ["npm", "start"]
