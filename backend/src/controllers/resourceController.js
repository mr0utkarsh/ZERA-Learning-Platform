import {
  listResources, getResource, recommendResources,
  setBookmark, listBookmarks, createResource, verifyResource
} from '../services/resourceService.js';

export const list = async (req, res, next) => {
  try {
    res.json({ success: true, data: await listResources({ ...req.query, verifiedOnly: req.query.verified === 'true' }) });
  } catch (e) { next(e); }
};
export const get = async (req, res, next) => {
  try { res.json({ success: true, data: await getResource(req.params.id) }); }
  catch (e) { next(e); }
};
export const recommend = async (req, res, next) => {
  try { res.json({ success: true, data: await recommendResources(req.user.id) }); }
  catch (e) { next(e); }
};
export const bookmark = async (req, res, next) => {
  try { res.json({ success: true, data: await setBookmark(req.user.id, req.params.id, req.body) }); }
  catch (e) { next(e); }
};
export const bookmarks = async (req, res, next) => {
  try { res.json({ success: true, data: await listBookmarks(req.user.id) }); }
  catch (e) { next(e); }
};
export const create = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await createResource(req.user.id, req.body) }); }
  catch (e) { next(e); }
};
export const verify = async (req, res, next) => {
  try { res.json({ success: true, data: await verifyResource(req.params.id, req.body.verified) }); }
  catch (e) { next(e); }
};
