FROM node:16

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install

COPY . .

# Expose the port the React app runs on
EXPOSE 3000

# Start the React development server
CMD ["npm", "start"]
