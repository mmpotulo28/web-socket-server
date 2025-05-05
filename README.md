# Web Socket Server

## Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Add a table named `bids` with the following structure:

    - `id` (UUID, primary key, default: `gen_random_uuid()`)
    - `itemId` (text)
    - `amount` (numeric)
    - `userId` (text)
    - `timestamp` (timestamp)

3. Add your Supabase URL and API key to the `.env.local` file.

## Docker Instructions

### Step 1: Build the Docker Image

Run the following command in the project directory to build the Docker image:

```bash
docker build -t web-socket-server .
```

### Step 2: Tag the Docker Image

Tag the image with your Docker Hub username and repository name:

```bash
docker tag web-socket-server mmpotulo28/web-socket-server:latest
```

### Step 3: Push the Docker Image to Docker Hub

Log in to Docker Hub:

```bash
docker login
```

Push the image to your Docker Hub repository:

```bash
docker push mmpotulo28/web-socket-server:latest
```

### Step 4: Deploy the Image to Azure

Run the following command to update the Azure Container App with the new image:

```bash
az containerapp update --name ws-server --resource-group onlyfriends-api --image mmpotulo28/web-socket-server:latest
```

### Step 5: Verify the Deployment

Run the following command to verify the active revisions of the Azure Container App:

```bash
az containerapp show --name ws-server --resource-group onlyfriends-api --query properties.configuration.activeRevisions
```

### Deploy and Run the Container Locally

Run the following command to deploy and start the container locally:

```bash
docker run -d -p 4200:4200 --name web-socket-server-container mmpotulo28/web-socket-server:latest
```

### Access the Application

The application will be accessible at `http://localhost:4200`.

### Stop and Remove the Container

To stop the container, run:

```bash
docker stop web-socket-server-container
```

To remove the container, run:

```bash
docker rm web-socket-server-container
```
