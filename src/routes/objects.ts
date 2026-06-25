import { Router } from 'express';
import { requireJwt, requireUserId } from '../middleware/auth';
import { sfRequest } from '../services/salesforce';

const router = Router();
const SF_API = '/services/data/v60.0';

const OBJECT_SCHEMAS: Record<string, any> = {
  Contact: {
    id: 'Contact', label: 'Contact', extendable: true,
    fields: [
      { id: 'Id', label: 'Id', type: 'string', logic_type: 'id', edit_type: 'text',
        visibility: { view: false, create: false, edit: false, required: false, editable: false }, relation: null, list: null },
      { id: 'FirstName', label: 'First Name', type: 'string', logic_type: 'first_name', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: false, editable: true }, relation: null, list: null },
      { id: 'LastName', label: 'Last Name', type: 'string', logic_type: 'last_name', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: true, editable: true }, relation: null, list: null },
      { id: 'Email', label: 'Email', type: 'string', logic_type: 'email', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: false, editable: true }, relation: null, list: null },
      { id: 'Phone', label: 'Phone', type: 'string', logic_type: 'phone', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: false, editable: true }, relation: null, list: null },
      { id: 'MobilePhone', label: 'Mobile', type: 'string', logic_type: 'phone', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: false, editable: true }, relation: null, list: null },
      { id: 'Title', label: 'Title', type: 'string', logic_type: 'other', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: false, editable: true }, relation: null, list: null },
    ]
  },
  Lead: {
    id: 'Lead', label: 'Lead', extendable: true,
    fields: [
      { id: 'Id', label: 'Id', type: 'string', logic_type: 'id', edit_type: 'text',
        visibility: { view: false, create: false, edit: false, required: false, editable: false }, relation: null, list: null },
      { id: 'FirstName', label: 'First Name', type: 'string', logic_type: 'first_name', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: false, editable: true }, relation: null, list: null },
      { id: 'LastName', label: 'Last Name', type: 'string', logic_type: 'last_name', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: true, editable: true }, relation: null, list: null },
      { id: 'Email', label: 'Email', type: 'string', logic_type: 'email', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: false, editable: true }, relation: null, list: null },
      { id: 'Phone', label: 'Phone', type: 'string', logic_type: 'phone', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: false, editable: true }, relation: null, list: null },
      { id: 'Company', label: 'Company', type: 'string', logic_type: 'other', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: true, editable: true }, relation: null, list: null },
    ]
  },
  Account: {
    id: 'Account', label: 'Account', extendable: true,
    fields: [
      { id: 'Id', label: 'Id', type: 'string', logic_type: 'id', edit_type: 'text',
        visibility: { view: false, create: false, edit: false, required: false, editable: false }, relation: null, list: null },
      { id: 'Name', label: 'Name', type: 'string', logic_type: 'other', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: true, editable: true }, relation: null, list: null },
      { id: 'Phone', label: 'Phone', type: 'string', logic_type: 'phone', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: false, editable: true }, relation: null, list: null },
      { id: 'Website', label: 'Website', type: 'string', logic_type: 'other', edit_type: 'text',
        visibility: { view: true, create: true, edit: true, required: false, editable: true }, relation: null, list: null },
    ]
  }
};

router.get('/object/describe/:objectType', requireJwt, (req, res) => {
  const schema = OBJECT_SCHEMAS[req.params.objectType];
  if (!schema) { res.status(404).json({ error: 'Desteklenmiyor' }); return; }
  res.json(schema);
});

router.post('/object/:objectType', requireJwt, requireUserId, async (req, res) => {
  const { objectType } = req.params;
  try {
    const data = await sfRequest(res.locals.clientId, res.locals.userId, 'post',
      `${SF_API}/sobjects/${objectType}`, req.body);
    res.status(201).json({ id: data.id, type: objectType, last_modified_timestamp: Math.floor(Date.now() / 1000) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/object/:objectType/:objectId', requireJwt, requireUserId, async (req, res) => {
  const { objectType, objectId } = req.params;
  const fields = req.query['fields'] as string | undefined;
  try {
    const data = await sfRequest(res.locals.clientId, res.locals.userId, 'get',
      `${SF_API}/sobjects/${objectType}/${objectId}${fields ? `?fields=${fields}` : ''}`);
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/object/:objectType/:objectId', requireJwt, requireUserId, async (req, res) => {
  const { objectType, objectId } = req.params;
  try {
    await sfRequest(res.locals.clientId, res.locals.userId, 'patch',
      `${SF_API}/sobjects/${objectType}/${objectId}`, req.body);
    res.json({ id: objectId, type: objectType, last_modified_timestamp: Math.floor(Date.now() / 1000) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/create-task', requireJwt, requireUserId, async (req, res) => {
  const body = req.body;
  try {
    await sfRequest(res.locals.clientId, res.locals.userId, 'post', `${SF_API}/sobjects/Task`, {
      Subject: body.subject || body.name || 'PBXware Call',
      Description: body.description || '',
      Status: 'Completed',
      ActivityDate: new Date().toISOString().split('T')[0],
      ...(body.object_id ? { WhatId: body.object_id } : {}),
    });
    res.status(201).send();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/integration', requireJwt, (_req, res) => {
  res.status(200).send();
});

export default router;
