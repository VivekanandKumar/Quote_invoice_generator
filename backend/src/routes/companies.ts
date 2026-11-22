import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../db';
import { Company } from '../models/Company';

export const companiesRouter = Router();

// GET /api/companies - List all companies from MongoDB
companiesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const companies = await Company.find().sort({ name: 1 }).lean();
    res.json({ success: true, data: companies });
  } catch (error: any) {
    console.error('Error fetching companies from MongoDB:', error.message);
    res.status(503).json({
      success: false,
      error: error.message || 'Failed to connect to MongoDB',
    });
  }
});

// POST /api/companies - Create a new company in MongoDB
companiesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, address, phone = '', email = '', gstin = '', isDefault = false } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Company name is required' });
      return;
    }

    if (!address || !address.trim()) {
      res.status(400).json({ success: false, error: 'Company address is required' });
      return;
    }

    await connectToDatabase();

    if (isDefault) {
      await Company.updateMany({}, { isDefault: false });
    }

    const created = await Company.create({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      gstin: gstin.trim().toUpperCase(),
      isDefault,
    });

    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    console.error('Error creating company in MongoDB:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save company to MongoDB',
    });
  }
});

// PUT /api/companies/:id - Update an existing company in MongoDB
companiesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, phone = '', email = '', gstin = '', isDefault = false } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Company name is required' });
      return;
    }

    await connectToDatabase();

    if (isDefault) {
      await Company.updateMany({ _id: { $ne: id } }, { isDefault: false });
    }

    const updated = await Company.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        address: address ? address.trim() : undefined,
        phone: phone.trim(),
        email: email.trim(),
        gstin: gstin.trim().toUpperCase(),
        isDefault,
      },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating company in MongoDB:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update company in MongoDB',
    });
  }
});

// DELETE /api/companies/:id - Delete a company from MongoDB
companiesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await connectToDatabase();
    const deleted = await Company.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    res.json({ success: true, message: 'Company deleted successfully from MongoDB' });
  } catch (error: any) {
    console.error('Error deleting company from MongoDB:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete company from MongoDB',
    });
  }
});
