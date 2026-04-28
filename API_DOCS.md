# AgriInsight Pro — API Reference

Base URL: `http://localhost:5000/api`

All protected routes require: `Authorization: Bearer <token>`

---

## Auth Endpoints

### POST /auth/register
```json
Body: { "name": "string", "email": "string", "password": "string", "organization": "string?" }
Response: { "success": true, "token": "jwt_token", "user": { ... } }
```

### POST /auth/login
```json
Body: { "email": "string", "password": "string" }
Response: { "success": true, "token": "jwt_token", "user": { ... } }
```

### GET /auth/me (protected)
```json
Response: { "success": true, "user": { "_id", "name", "email", "role", "organization", "preferences", "lastLogin" } }
```

---

## Analytics Endpoints (all protected)

Query params available on all: `crop`, `state`, `yearFrom`, `yearTo`

### GET /analytics/stats
```json
Response: {
  "data": {
    "totalRecords": 1320, "totalCrops": 10, "totalStates": 12,
    "avgYield": 2450, "totalProduction": 450000, "avgRainfall": 850,
    "avgPrice": 3200, "crops": ["Rice", ...], "states": ["Punjab", ...]
  }
}
```

### GET /analytics/yield-trend
```json
Response: { "data": [{ "year": 2020, "rainfall": 800, "production": 45000, "price": 2100 }, ...] }
```

### GET /analytics/crop-comparison
```json
Response: { "data": [{ "crop": "Wheat", "avgYield": 3100, "avgRainfall": 650, "avgPrice": 2015, "totalProduction": 380000, "records": 120 }, ...] }
```

### GET /analytics/state-heatmap
```json
Response: { "data": [{ "state": "Punjab", "yield": 3200, "rainfall": 700, "price": 2100, "production": 150000 }, ...] }
```

### GET /analytics/price-trend
```json
Response: { "data": [{ "year": 2020, "crop": "Wheat", "avgPrice": 2000, "minPrice": 1900, "maxPrice": 2100 }, ...] }
```

---

## Predictions Endpoints (all protected)

### POST /predictions/yield
```json
Body: { "crop": "Wheat", "state": "Punjab", "targetYear": 2026 }
Response: {
  "prediction": {
    "type": "yield", "crop": "Wheat", "state": "Punjab",
    "targetYear": 2026, "predictedValue": 3350,
    "confidence": 78, "algorithm": "linear_regression",
    "r2Score": 0.85, "rmse": 120.5,
    "historicalData": [...], "forecastData": [...],
    "changePct": 8.2, "trend": "increasing"
  }
}
```

### POST /predictions/price
```json
Body: { "crop": "Rice", "state": "Andhra Pradesh", "targetYear": 2026, "periods": 3 }
Response: { "prediction": { ...same structure..., "smoothedHistorical": [...] } }
```

### GET /predictions/history
Query params: `type` (yield|price), `crop`, `state`

### GET /predictions/multivariate
```json
Response: {
  "correlations": { "yield": { "rainfall": 0.72, "price": 0.31, ... }, ... },
  "metrics": ["yield", "rainfall", "price", ...],
  "dataPoints": 450
}
```

---

## Upload Endpoints (all protected)

### POST /upload
```
Content-Type: multipart/form-data
Body: file (CSV or XLSX, max 50MB)
Response: {
  "stats": {
    "totalRows": 500, "imported": 487, "errors": 13,
    "nullsFilled": 23, "duplicatesSkipped": 5,
    "columnMap": { "crop": "Crop Name", "state": "State", ... },
    "errorDetails": [{ "row": 5, "reason": "Missing crop" }, ...]
  }
}
```

### GET /upload/records
Query params: `page`, `limit`, `crop`, `state`, `year`

---

## Alerts Endpoints (all protected)

### GET /alerts
Query params: `type`, `severity`, `isRead`, `page`, `limit`

### POST /alerts
```json
Body: { "type": "custom", "title": "string", "message": "string", "severity": "medium", "crop": "?", "state": "?" }
```

### PUT /alerts/read
```json
Body: { "ids": ["id1", "id2"] }  // empty ids = mark all read
```

### POST /alerts/:id/email
Sends the alert as an email to the authenticated user.

---

## Weather Endpoints (all protected)

### GET /weather
Returns mock/live weather for all 28 Indian states.

### GET /weather/:state
```json
Response: {
  "state": "Punjab",
  "weather": {
    "temperature": 28, "feelsLike": 26, "humidity": 60,
    "description": "partly cloudy", "windSpeed": 12,
    "rainfall": 5, "visibility": 10, "pressure": 1012
  },
  "source": "openweathermap | mock"
}
```

---

## Error Format
```json
{ "error": "Description of what went wrong" }
```

HTTP Status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Server Error
