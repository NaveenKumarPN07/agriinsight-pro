const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const AgriData = require('../models/AgriData');

const COLUMN_MAPPINGS = {
  crop: ['crop', 'crop_name', 'cropname', 'crop name', 'commodity'],
  state: ['state', 'state_name', 'statename', 'state name', 'province'],
  district: ['district', 'district_name'],
  year: ['year', 'yr', 'crop_year', 'cropyear'],
  season: ['season', 'crop_season'],
  area: ['area', 'area_ha', 'cultivated_area', 'area hectares'],
  production: ['production', 'production_tonnes', 'output'],
  yield: ['yield', 'yield_kg', 'productivity', 'yield_per_ha'],
  rainfall: ['rainfall', 'annual_rainfall', 'rain', 'precipitation'],
  temperature: ['temperature', 'temp', 'avg_temp'],
  price: ['price', 'market_price', 'msp', 'price_per_quintal'],
  fertilizer: ['fertilizer', 'fertilizer_usage', 'fert'],
  pesticide: ['pesticide', 'pesticide_usage'],
};

const detectColumn = (headers, fieldName) => {
  const mappings = COLUMN_MAPPINGS[fieldName] || [fieldName];
  for (const header of headers) {
    const h = header.toLowerCase().trim().replace(/\s+/g, '_');
    if (mappings.some(m => h === m || h.includes(m) || m.includes(h))) {
      return header;
    }
  }
  return null;
};

const cleanValue = (value, type) => {
  if (value === null || value === undefined || value === '' || value === 'NA' || value === 'N/A' || value === '-') {
    return null;
  }
  const str = String(value).trim();
  if (type === 'number') {
    const num = parseFloat(str.replace(/,/g, ''));
    return isNaN(num) ? null : num;
  }
  if (type === 'string') return str;
  if (type === 'integer') {
    const num = parseInt(str.replace(/,/g, ''));
    return isNaN(num) ? null : num;
  }
  return str;
};

exports.uploadDataset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let rows = [];

    if (fileExt === '.csv') {
      rows = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    } else if (['.xlsx', '.xls'].includes(fileExt)) {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Invalid file type. Upload CSV or Excel files only.' });
    }

    if (rows.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'File is empty or has no valid data.' });
    }

    // Detect columns
    const headers = Object.keys(rows[0]);
    const columnMap = {};
    Object.keys(COLUMN_MAPPINGS).forEach(field => {
      columnMap[field] = detectColumn(headers, field);
    });

    // Validate required columns
    if (!columnMap.crop || !columnMap.state || !columnMap.year) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: 'Missing required columns. File must contain: crop, state, year',
        detectedColumns: columnMap,
        availableHeaders: headers,
      });
    }

    // Process & clean data
    const documents = [];
    const errors = [];
    let nullFilled = 0;
    let duplicatesSkipped = 0;

    const seen = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const crop = cleanValue(row[columnMap.crop], 'string');
      const state = cleanValue(row[columnMap.state], 'string');
      const year = columnMap.year ? cleanValue(row[columnMap.year], 'integer') : null;

      if (!crop || !state || !year) {
        errors.push({ row: i + 2, reason: 'Missing crop, state, or year' });
        continue;
      }

      const key = `${crop}-${state}-${year}`;
      if (seen.has(key)) {
        duplicatesSkipped++;
        continue;
      }
      seen.add(key);

      const area = columnMap.area ? cleanValue(row[columnMap.area], 'number') : 0;
      const production = columnMap.production ? cleanValue(row[columnMap.production], 'number') : 0;
      let yieldVal = columnMap.yield ? cleanValue(row[columnMap.yield], 'number') : null;

      // Auto-calculate yield if missing but area and production present
      if (!yieldVal && area && production) {
        yieldVal = (production * 1000) / area; // tonnes to kg, per hectare
        nullFilled++;
      }

      const doc = {
        userId: req.user._id,
        crop: crop.charAt(0).toUpperCase() + crop.slice(1).toLowerCase(),
        state: state.trim(),
        district: columnMap.district ? cleanValue(row[columnMap.district], 'string') || '' : '',
        year,
        season: columnMap.season ? cleanValue(row[columnMap.season], 'string') || 'Kharif' : 'Kharif',
        area: area || 0,
        production: production || 0,
        yield: yieldVal || 0,
        rainfall: columnMap.rainfall ? cleanValue(row[columnMap.rainfall], 'number') || 0 : 0,
        temperature: columnMap.temperature ? cleanValue(row[columnMap.temperature], 'number') || 0 : 0,
        price: columnMap.price ? cleanValue(row[columnMap.price], 'number') || 0 : 0,
        fertilizer: columnMap.fertilizer ? cleanValue(row[columnMap.fertilizer], 'number') || 0 : 0,
        pesticide: columnMap.pesticide ? cleanValue(row[columnMap.pesticide], 'number') || 0 : 0,
        sourceFile: req.file.originalname,
      };

      documents.push(doc);
    }

    // Bulk insert
    let insertedCount = 0;
    if (documents.length > 0) {
      const result = await AgriData.insertMany(documents, { ordered: false });
      insertedCount = result.length;
    }

    // Cleanup file
    fs.unlinkSync(filePath);

    // Emit real-time event
    if (global.io) {
      global.io.emit('data:uploaded', {
        userId: req.user._id.toString(),
        count: insertedCount,
        filename: req.file.originalname,
      });
    }

    res.json({
      success: true,
      message: `Successfully imported ${insertedCount} records.`,
      stats: {
        totalRows: rows.length,
        imported: insertedCount,
        errors: errors.length,
        nullsFilled: nullFilled,
        duplicatesSkipped,
        columnMap,
        errorDetails: errors.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to process file upload.' });
  }
};

exports.getDataRecords = async (req, res) => {
  try {
    const { crop, state, year, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user._id };
    if (crop && crop !== 'all') filter.crop = crop;
    if (state && state !== 'all') filter.state = state;
    if (year) filter.year = parseInt(year);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      AgriData.find(filter).sort({ year: -1 }).skip(skip).limit(parseInt(limit)),
      AgriData.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data records.' });
  }
};

exports.deleteRecords = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids array is required.' });
    }
    const result = await AgriData.deleteMany({ _id: { $in: ids }, userId: req.user._id });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete records.' });
  }
};
