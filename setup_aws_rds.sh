#!/bin/bash

# Quick AWS RDS Setup Script for Recall

echo "🚀 Setting up AWS RDS PostgreSQL for Recall..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Install it first: https://aws.amazon.com/cli/"
    exit 1
fi

# Variables
DB_INSTANCE_ID="recall-db"
DB_USERNAME="recall_admin"
DB_PASSWORD="Recall2024!SecurePass"  # Change this!
DB_CLASS="db.t3.micro"
REGION="us-east-1"

echo "📦 Creating RDS PostgreSQL instance..."
aws rds create-db-instance \
    --db-instance-identifier $DB_INSTANCE_ID \
    --db-instance-class $DB_CLASS \
    --engine postgres \
    --engine-version 15.4 \
    --master-username $DB_USERNAME \
    --master-user-password $DB_PASSWORD \
    --allocated-storage 20 \
    --publicly-accessible \
    --backup-retention-period 7 \
    --region $REGION \
    --no-multi-az \
    --storage-type gp2

echo "⏳ Waiting for database to be available (this takes 5-10 minutes)..."
aws rds wait db-instance-available \
    --db-instance-identifier $DB_INSTANCE_ID \
    --region $REGION

echo "✅ Database created!"

# Get endpoint
ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region $REGION)

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 Add this to your .env file:"
echo ""
echo "DATABASE_URL=postgresql://$DB_USERNAME:$DB_PASSWORD@$ENDPOINT:5432/postgres"
echo ""
echo "🔐 Security Group: Make sure to allow your IP on port 5432"
echo ""
echo "📚 Next steps:"
echo "1. pip install psycopg2-binary dj-database-url"
echo "2. Update .env with DATABASE_URL above"
echo "3. python manage.py migrate"
echo "4. python manage.py setup_org"
echo ""
