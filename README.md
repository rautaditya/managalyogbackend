# 🏢 Mangalyog Enterprise — MySQL Backend

Node.js + Express + MySQL backend for the Mangalyog Enterprise billing & site management system.

---

## 📁 Folder Structure

```
backend/
├── config/
│   └── db.js                  ← MySQL pool connection
├── controllers/
│   ├── authController.js
│   ├── siteController.js
│   ├── transactionController.js
│   ├── invoiceController.js
│   └── quotationController.js
├── middleware/
│   ├── authMiddleware.js
│   └── errorMiddleware.js
├── routes/
│   ├── authRoutes.js
│   ├── siteRoutes.js
│   ├── transactionRoutes.js
│   ├── invoiceRoutes.js
│   └── quotationRoutes.js
├── utils/
│   ├── migrate.js             ← Creates all MySQL tables
│   ├── seed.js                ← Inserts default admin
│   ├── generateToken.js
│   ├── excelExport.js
│   └── invoicePDF.js
├── validations/
│   ├── authValidation.js
│   ├── siteValidation.js
│   └── transactionValidation.js
├── .env
├── server.js
└── package.json
```

---

## 🗄️ MySQL Database Tables

| Table            | Description                        |
|------------------|------------------------------------|
| `admins`         | Admin users                        |
| `sites`          | Sites / projects                   |
| `transactions`   | Money IN / OUT records             |
| `invoices`       | Invoice headers                    |
| `invoice_items`  | Line items for each invoice        |
| `quotations`     | Quotation headers                  |
| `quotation_items`| Line items for each quotation      |

---

## ⚙️ Setup Instructions

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure .env
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mangalyog

JWT_SECRET=mangalyog_super_secret_jwt_key_2026
JWT_EXPIRES_IN=7d
```

### 3. Create MySQL database
```sql
CREATE DATABASE mangalyog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run migrations (creates all tables)
```bash
npm run migrate
```

### 5. Seed default admin
```bash
npm run seed
```

### 6. Start server
```bash
npm run dev     # development (nodemon)
npm start       # production
```

---

## 🔐 Default Login

| Field    | Value                 |
|----------|-----------------------|
| Email    | admin@mangalyog.com   |
| Password | admin123              |

> ⚠️ Change password after first login!

---

## 📡 API Endpoints

### Auth — `/api/auth`
| Method | Endpoint            | Description      |
|--------|---------------------|------------------|
| POST   | /login              | Admin login      |
| POST   | /register           | Register admin   |
| GET    | /profile            | Get profile      |
| PUT    | /change-password    | Change password  |

### Sites — `/api/sites`
| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| GET    | /                   | List all sites       |
| POST   | /                   | Create site          |
| GET    | /:id                | Get site by ID       |
| GET    | /:id/dashboard      | Site stats + txns    |
| PUT    | /:id                | Update site          |
| DELETE | /:id                | Delete site          |

### Transactions — `/api/transactions`
| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| GET    | /                   | List (with filters)  |
| POST   | /                   | Create transaction   |
| GET    | /summary            | Dashboard totals     |
| GET    | /export             | Download Excel       |
| GET    | /:id                | Get by ID            |
| PUT    | /:id                | Update               |
| DELETE | /:id                | Delete               |

### Invoices — `/api/invoices`
| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| GET    | /                   | List invoices        |
| POST   | /                   | Create invoice       |
| GET    | /:id                | Get invoice + items  |
| PUT    | /:id                | Update invoice       |
| DELETE | /:id                | Delete invoice       |
| GET    | /:id/pdf            | Download PDF         |

### Quotations — `/api/quotations`
| Method | Endpoint            | Description            |
|--------|---------------------|------------------------|
| GET    | /                   | List quotations        |
| POST   | /                   | Create quotation       |
| GET    | /:id                | Get quotation + items  |
| PUT    | /:id                | Update quotation       |
| DELETE | /:id                | Delete quotation       |
| POST   | /:id/convert        | Convert to invoice     |
| GET    | /:id/pdf            | Download PDF           |

---

## 🔍 Query Filters

**Transactions:** `?site_id=1&type=IN&payment_mode=UPI&start_date=2026-01-01&end_date=2026-12-31`

**Invoices:** `?site_id=1&status=unpaid`

**Quotations:** `?site_id=1&status=draft`

**Excel Export:** `?site_id=1` (omit for all sites)
