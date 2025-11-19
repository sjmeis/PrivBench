FROM node:20

WORKDIR /app

# Copy only package manifests to leverage Docker caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Build the frontend app
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
