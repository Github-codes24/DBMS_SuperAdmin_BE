# LTS-DBMS Vendor Panel - Frontend Integration Guide

This document provides details for the Frontend team to integrate the **Local Trade Street (LTS)** Vendor Master Control Panel with the Node.js/Express backend API.

---

## 1. Global Specifications

* **Base URL**: `http://localhost:5000`
* **Authentication**: Token-based authentication using JSON Web Tokens (JWT).
  * After a successful login, the backend returns a `token` string.
  * The frontend must include this token in the `Authorization` header for all protected API routes:
    ```http
    Authorization: Bearer <your_jwt_token>
    ```

---

## 2. API Endpoints Reference

### **1. Authentication**

#### **Vendor Login**
* **URL**: `/api/auth/login`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "loginId": "arham@lts.com", // Accepts Email address OR Vendor ID
    "password": "password123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "_id": "60d0fe4f5311236168a109ca",
    "vendorId": "arham@lts.com",
    "fullName": "Mohd Arham",
    "email": "arham@lts.com",
    "storeName": "Ar Fresh Mart",
    "storeStatus": "Active & Verified",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### **Get Profile Details**
* **URL**: `/api/auth/profile`
* **Method**: `GET`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**:
  ```json
  {
    "_id": "60d0fe4f5311236168a109ca",
    "vendorId": "arham@lts.com",
    "email": "arham@lts.com",
    "fullName": "Mohd Arham",
    "phone": "+91 98765 43210",
    "designation": "Senior Vendor & Regional Store Manager",
    "regionalJurisdiction": "All India Vendor Operations",
    "storeName": "Ar Fresh Mart",
    "storeStatus": "Active & Verified",
    "twoFactorAuth": true,
    "emailAlerts": true,
    "syncFrequency": "Real-Time (Instant)",
    "avatar": "https://images.unsplash.com/...jpg"
  }
  ```

---

### **2. Dashboard Stats & Filters**

#### **Get Dashboard Stats Counters**
* **URL**: `/api/dashboard/stats`
* **Method**: `GET`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**:
  ```json
  {
    "totalProducts": 6,
    "activeProducts": 5,
    "ordersToday": 5,
    "pendingQueries": 2,
    "vendorActivity": 1006,
    "onlineUsers": 149,
    "pendingVendorPayment": "No Pending Payments"
  }
  ```

#### **Get Cascade Filters (States, Categories, Subcategories)**
* **URL**: `/api/dashboard/cascade-data`
* **Method**: `GET`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**:
  ```json
  {
    "states": [{ "_id": "...", "name": "Maharashtra", "vendorCount": 1950958 }],
    "categories": [{ "_id": "...", "name": "Grocery & FMCG", "vendorCount": 5420100 }],
    "subcategories": [{ "_id": "...", "name": "Supermarkets & Kirana", "parentCategory": "Grocery & FMCG", "vendorCount": 510200 }]
  }
  ```

#### **Add Filter State**
* **URL**: `/api/dashboard/states`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "name": "Uttar Pradesh",
    "vendorCount": 1280656 // Optional
  }
  ```

#### **Add Filter Category**
* **URL**: `/api/dashboard/categories`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "name": "Grocery & FMCG",
    "vendorCount": 5420100 // Optional
  }
  ```

---

### **3. My Products**

#### **List Products**
* **URL**: `/api/products?page=1&limit=10&search=Mango&category=Grocery&status=In Stock`
* **Method**: `GET`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**:
  ```json
  {
    "products": [
      {
        "_id": "60d0fe4f5311236168a109cb",
        "sku": "LTS-GRO-001",
        "name": "Organic Alphonso Mangoes (1 Dozen)",
        "category": "Grocery",
        "price": 809,
        "originalPrice": 1000,
        "stock": 45,
        "status": "In Stock",
        "image": "https://..."
      }
    ],
    "page": 1,
    "pages": 1,
    "totalProducts": 1
  }
  ```

#### **Add Product**
* **URL**: `/api/products`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "sku": "LTS-GRO-009",
    "name": "Organic Honey 500g",
    "category": "Grocery",
    "price": 599,
    "stock": 50,
    "originalPrice": 699, // Optional
    "image": "https://..." // Optional
  }
  ```

#### **Export Products CSV**
* **URL**: `/api/products/export-csv`
* **Method**: `GET`
* **Response**: Streamed file download `lts_vendor_products_YYYY-MM-DD.csv`.

---

### **4. Orders**

#### **List Orders**
* **URL**: `/api/orders?page=1&limit=10&search=Aarav&deliveryStatus=Delivered`
* **Method**: `GET`
* **Success Response (200 OK)**:
  ```json
  {
    "orders": [
      {
        "_id": "60d0fe4f5311236168a109cd",
        "orderId": "ORD-9401",
        "customerName": "Aarav Mehta",
        "products": "Organic Alphonso Mangoes (2x), Malabar Black Pepper (1x)",
        "amount": 1938,
        "paymentStatus": "Paid",
        "deliveryStatus": "Delivered",
        "orderDate": "2026-08-04T12:00:00.000Z"
      }
    ],
    "page": 1,
    "pages": 1,
    "totalOrders": 1
  }
  ```

#### **Recent Orders (Dashboard Table)**
* **URL**: `/api/orders/recent`
* **Method**: `GET`
* **Response**: Array of 4 latest orders.

#### **Update Order Delivery Status**
* **URL**: `/api/orders/:orderId/delivery-status`
* **Method**: `PATCH`
* **Request Body**:
  ```json
  {
    "deliveryStatus": "Delivered" // Options: 'Pending', 'Confirmed', 'Delivered', 'Cancelled'
  }
  ```
  *(Note: Setting status to 'Delivered' automatically updates paymentStatus to 'Paid' on the backend).*

---

### **5. Customer Database**

#### **List Customers**
* **URL**: `/api/customers?page=1&search=Ananya`
* **Method**: `GET`
* **Response**: Paginated customer objects containing `customerId`, `name`, `mobile`, and `status` (`Active` / `Disabled`).

#### **Update Customer Settings**
* **URL**: `/api/customers/:customerId`
* **Method**: `PUT`
* **Request Body**:
  ```json
  {
    "name": "Ananya Deshmukh",
    "mobile": "+91 98776 65544",
    "status": "Active" // Options: 'Active', 'Disabled'
  }
  ```

---

### **6. Vendor Database (Inventory)**

#### **List Stock Inventory**
* **URL**: `/api/inventory?page=1&search=LTS-GRO-001`
* **Method**: `GET`
* **Response**: Returns products with fields `sku`, `name`, `category`, `stock` (stock count level), and `status` (`In Stock` / `Low Stock` / `Out of Stock`).

#### **Update Inventory Stock**
* **URL**: `/api/inventory/:sku`
* **Method**: `PUT`
* **Request Body**:
  ```json
  {
    "stock": 45,
    "status": "In Stock" // Optional override
  }
  ```

---

### **7. Sales Reports**

#### **List Reports**
* **URL**: `/api/reports?page=1`
* **Method**: `GET`
* **Response**: Returns configurations with fields `reportId`, `name`, `period` (`Daily Summary`, `Weekly Aggregate`, `Monthly Analytics`), `customersCount`, and `status`.

#### **Save Report Parameters**
* **URL**: `/api/reports/:reportId`
* **Method**: `PUT`
* **Request Body**:
  ```json
  {
    "name": "Weekly Performance Report",
    "period": "Weekly Aggregate",
    "status": "Active (Generating)" // Options: 'Active (Generating)', 'Disabled (Archived)'
  }
  ```

---

### **8. Profile & Settings**

#### **Update Profile Details**
* **URL**: `/api/profile`
* **Method**: `PUT`
* **Request Body**:
  ```json
  {
    "fullName": "Mohd Arham",
    "phone": "+91 98765 43210",
    "designation": "Senior Vendor & Regional Store Manager",
    "regionalJurisdiction": "All India Vendor Operations",
    "avatar": "https://..."
  }
  ```

#### **Change Security Password**
* **URL**: `/api/profile/password`
* **Method**: `PUT`
* **Request Body**:
  ```json
  {
    "currentPassword": "password123",
    "newPassword": "newpassword123",
    "confirmPassword": "newpassword123"
  }
  ```

#### **Update Preference Configurations**
* **URL**: `/api/profile/preferences`
* **Method**: `PUT`
* **Request Body**:
  ```json
  {
    "twoFactorAuth": true,
    "emailAlerts": true,
    "syncFrequency": "Real-Time (Instant)" // Options: 'Real-Time (Instant)', 'Hourly Sync', 'Daily Midnight'
  }
  ```

---

### **9. Notifications**

#### **List Notifications Alerts**
* **URL**: `/api/notifications?page=1`
* **Method**: `GET`
* **Response**: Returns list of notification items and `unreadCount`.

#### **Mark Alert as Read / Dismiss**
* **URL**: `/api/notifications/:id/read`
* **Method**: `PATCH`

#### **Mark All Alerts as Read**
* **URL**: `/api/notifications/read-all`
* **Method**: `PATCH`

---

### **10. Help & Support**

#### **List Support Tickets**
* **URL**: `/api/tickets?page=1`
* **Method**: `GET`

#### **Get Ticket Details & Chat Log**
* **URL**: `/api/tickets/:ticketId`
* **Method**: `GET`
* **Response**: Returns details of the ticket, `assignedAgent`, and replies thread list:
  ```json
  {
    "ticketId": "TKT-8021",
    "category": "Payout & Settlement",
    "subject": "Query regarding weekly settlement credit",
    "description": "...",
    "status": "In Progress",
    "replies": [
      { "sender": "Vendor", "message": "My payout...", "timestamp": "..." }
    ]
  }
  ```

#### **Raise Ticket**
* **URL**: `/api/tickets`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "category": "Payout & Settlement",
    "subject": "Query regarding weekly settlement credit",
    "description": "Details...",
    "priority": "High Priority" // Options: 'Low Priority', 'Medium Priority', 'High Priority', 'Urgent Priority'
  }
  ```

#### **Reply to Support Ticket**
* **URL**: `/api/tickets/:ticketId/replies`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "message": "Hello, any updates on this?"
  }
  ```
