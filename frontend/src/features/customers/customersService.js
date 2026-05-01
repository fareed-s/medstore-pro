// Service layer — pure HTTP. No state, no UI concerns.
// Keeps API URLs in one place so tests can mock this file in isolation.

import API from '../../utils/api';

export const listCustomers = async ({ search, type } = {}) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (type)   params.set('type', type);
  const qs = params.toString();
  const { data } = await API.get(`/customers${qs ? `?${qs}` : ''}`);
  return data.data;
};

export const createCustomer = async (payload) => {
  const { data } = await API.post('/customers', payload);
  return data.data;
};

export const updateCustomer = async (id, payload) => {
  const { data } = await API.put(`/customers/${id}`, payload);
  return data.data;
};
