# Frontend Database Setup Guide

This guide explains how to set up the PostgreSQL database for the ZugChain Frontend on a **new Ubuntu Machine**.

## Prerequisites

-   A new Ubuntu 22.04+ Server
-   Root or Sudo access

## Step 1: Install PostgreSQL

Run these commands on your **New Database Server**:

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and Enable Service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Step 2: Configure Database & User

You need to create the specific user and database that the frontend expects.

```bash
# Switch to postgres user
sudo -i -u postgres

# Enter PostgreSQL prompt
psql
```

Inside the `psql` shell, run:

```sql
-- 1. Create User (Replace 'password' with a STRONG one)
CREATE USER blockscout WITH PASSWORD 'zugchain_explorer_2024';

-- 2. Create Database
CREATE DATABASE zug_incentive;

-- 3. Grant Privileges
GRANT ALL PRIVILEGES ON DATABASE zug_incentive TO blockscout;

-- 4. Grant Schema Privileges (Important for newer PG versions)
\c zug_incentive
GRANT ALL ON SCHEMA public TO blockscout;
```

Type `\q` to exit, then `exit` to return to your normal user.

## Step 3: Allow Remote Access (If Frontend is on a Different Machine)

**If your Frontend and Database are on DIFFERENT machines:**

1.  Edit `postgresql.conf`:
    ```bash
    sudo nano /etc/postgresql/14/main/postgresql.conf
    # Change listen_addresses = 'localhost' to:
    # listen_addresses = '*'
    ```

2.  Edit `pg_hba.conf` to allow the Frontend IP:
    ```bash
    sudo nano /etc/postgresql/14/main/pg_hba.conf
    # Add this line at the end:
    # host    zug_incentive   blockscout      FRONTEND_IP_ADDRESS/32      scram-sha-256
    ```

3.  Restart PostgreSQL:
    ```bash
    sudo systemctl restart postgresql
    ```

## Step 4: Import the Schema

You need to apply the table structure.

1.  Copy the `database_schema.sql` file (found in your `frontend` folder) to the server.
2.  Run the import:

```bash
PGPASSWORD='zugchain_explorer_2024' psql -h localhost -U blockscout -d zug_incentive -f database_schema.sql
```

## Step 5: Connect Frontend

On your **Frontend Machine**, update the `.env` file with the new database address:

```env
DATABASE_URL="postgres://blockscout:zugchain_explorer_2024@NEW_DB_MACHINE_IP:5432/zug_incentive"
```

## Step 6: Verify

Run the frontend locally to test the connection:

```bash
npm run dev
```

If it connects without "Connection Refused" errors, you are good to go!
