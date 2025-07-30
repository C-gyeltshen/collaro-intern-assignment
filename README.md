# Collaro Singapore Dashboard Application

### Overview
This project is a dashboard application for Collaro Singapore, built using Nextjs, Tailwind CSS, Material UI and Superbase postghresql database. The application is designed to provide a user-friendly interface for managing and visualizing customer data.

## Part 1 : Project Setup & Mock API Backend

### Objectives
- Set up a Next.js project with Tailwind CSS and Material UI.
- Connect the project to a Superbase PostgreSQL database.
- Create a mock API backend to simulate data fetching.
- Design database schema for customer data.

### Steps

1. **Initialize Next.js Project**
   - Create a new Next.js project using:  
        ```bash
        npx create-next-app@latest collaro-intern-assignment
        ```
   - Navigate to the project directory: 
        ```bash
        cd collaro-intern-assignment
        ```
   - Install Material UI : 
        ```bash
        npm install @mui/material-nextjs @emotion/cache
        ```

2. **Connect Supabase Database**
   - Sign up for a Supabase account and create a new project.
   - Get the API keys and database URL from the Supabase dashboard.
   - Install the Supabase client library:
        ```bash
        npm install @supabase/supabase-js
        ```
   - Create a `.env.local` file in the root of your project and add your Supabase credentials:
        ```
        NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
        ```
