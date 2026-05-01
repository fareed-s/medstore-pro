import API from '../../utils/api';

export const listMedicines = async ({ page = 1, limit = 25, search, category, schedule, stockStatus } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search)      params.set('search', search);
  if (category)    params.set('category', category);
  if (schedule)    params.set('schedule', schedule);
  if (stockStatus) params.set('stockStatus', stockStatus);
  const { data } = await API.get(`/medicines?${params}`);
  return { list: data.data, pagination: data.pagination };
};
