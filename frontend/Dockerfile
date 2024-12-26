FROM node:18

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install -g npm@10.8.2
RUN npm cache clean --force
RUN npm install

COPY . .

# Build the frontend application
RUN npm run build

# Expose the port the React app runs on
EXPOSE 3000

# Start the React development server
CMD ["npm", "start"]
