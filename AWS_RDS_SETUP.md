# AWS RDS PostgreSQL Setup Guide

## Step 1: Create RDS PostgreSQL Database

### Using AWS Console:
1. Go to AWS RDS Console: https://console.aws.amazon.com/rds/
2. Click "Create database"
3. Choose:
   - **Engine**: PostgreSQL
   - **Version**: PostgreSQL 15.x (latest)
   - **Template**: Free tier (for testing) or Production
   - **DB instance identifier**: `recall-db`
   - **Master username**: `recall_admin`
   - **Master password**: (create strong password)
   - **DB instance class**: db.t3.micro (free tier) or db.t3.small
   - **Storage**: 20 GB (free tier allows up to 20GB)
   - **Public access**: Yes (for development)
   - **VPC security group**: Create new → Allow PostgreSQL (5432) from your IP
4. Click "Create database"
5. Wait 5-10 minutes for creation

### Using AWS CLI (Alternative):
```bash
aws rds create-db-instance \
    --db-instance-identifier recall-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username recall_admin \
    --master-user-password YOUR_STRONG_PASSWORD \
    --allocated-storage 20 \
    --publicly-accessible \
    --region us-east-1
```

## Step 2: Get Database Endpoint

After creation, get the endpoint:
```bash
aws rds describe-db-instances \
    --db-instance-identifier recall-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text
```

Example output: `recall-db.xxxxxxxxx.us-east-1.rds.amazonaws.com`

## Step 3: Update Django Settings

### Install PostgreSQL adapter:
```bash
pip install psycopg2-binary
```

### Update .env file:
```env
# Replace this line:
DATABASE_URL=sqlite:///db.sqlite3

# With this (update with your values):
DATABASE_URL=postgresql://recall_admin:YOUR_PASSWORD@recall-db.xxxxxxxxx.us-east-1.rds.amazonaws.com:5432/postgres
```

### Or set individual variables:
```env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=postgres
DB_USER=recall_admin
DB_PASSWORD=YOUR_PASSWORD
DB_HOST=recall-db.xxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
```

## Step 4: Update Django settings.py

Add to settings.py:
```python
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL'),
        conn_max_age=600
    )
}
```

## Step 5: Migrate Database

```bash
cd backend
python manage.py migrate
python manage.py setup_org --org-name "Your Company" --org-slug "your-company" --admin-username "admin" --admin-password "secure-password"
```

## Step 6: Security Best Practices

### Update Security Group:
1. Go to RDS → Your database → Connectivity & security
2. Click on VPC security group
3. Edit inbound rules:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Your IP or EC2 security group (for production)

### For Production:
- Set `publicly-accessible` to `No`
- Use VPC peering or AWS PrivateLink
- Enable encryption at rest
- Enable automated backups
- Use IAM database authentication

## Cost Estimate

### Free Tier (12 months):
- db.t3.micro instance: FREE
- 20 GB storage: FREE
- 20 GB backup: FREE

### After Free Tier:
- db.t3.micro: ~$15/month
- db.t3.small: ~$30/month
- Storage: $0.115/GB/month
- Backup: $0.095/GB/month

## Troubleshooting

### Connection timeout:
- Check security group allows your IP on port 5432
- Verify `publicly-accessible` is enabled
- Check VPC and subnet settings

### Authentication failed:
- Verify username and password
- Check DATABASE_URL format

### SSL required:
Add to DATABASE_URL: `?sslmode=require`

## Alternative: Use AWS RDS Proxy (Optional)

For better connection pooling and security:
```bash
aws rds create-db-proxy \
    --db-proxy-name recall-proxy \
    --engine-family POSTGRESQL \
    --auth SecretArn=arn:aws:secretsmanager:... \
    --role-arn arn:aws:iam::...:role/... \
    --vpc-subnet-ids subnet-xxx subnet-yyy
```

## Backup & Restore

### Manual Backup:
```bash
pg_dump -h recall-db.xxx.rds.amazonaws.com -U recall_admin -d postgres > backup.sql
```

### Restore:
```bash
psql -h recall-db.xxx.rds.amazonaws.com -U recall_admin -d postgres < backup.sql
```

## Monitoring

Enable CloudWatch metrics:
- CPU utilization
- Database connections
- Free storage space
- Read/Write IOPS

Set up alarms for:
- High CPU (>80%)
- Low storage (<10%)
- Connection count (>80% of max)
