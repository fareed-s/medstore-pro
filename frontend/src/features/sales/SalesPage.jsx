import { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { toast } from 'react-toastify';
import { apiError } from '../../utils/helpers';
import {
  fetchSales, fetchTodaySummary, voidSaleThunk,
  selectSalesFilters, selectSalesPaging, setPage,
} from './salesSlice';
import SalesSummary from './components/SalesSummary';
import SalesFilters from './components/SalesFilters';
import SalesTable from './components/SalesTable';
import Pagination from '../../shared/components/Pagination';

export default function SalesPage() {
  const dispatch = useDispatch();
  const filters = useSelector(selectSalesFilters, shallowEqual);
  const paging  = useSelector(selectSalesPaging,  shallowEqual);

  const refetch = useCallback(() => dispatch(fetchSales(filters)), [dispatch, filters]);

  useEffect(() => { refetch(); }, [refetch]);
  useEffect(() => { dispatch(fetchTodaySummary()); }, [dispatch]);

  const onVoid = useCallback(async (id) => {
    const reason = window.prompt('Enter void reason:');
    if (!reason) return;
    try {
      await dispatch(voidSaleThunk({ id, reason })).unwrap();
      toast.success('Sale voided');
      dispatch(fetchTodaySummary());
    } catch (err) { toast.error(apiError(err)); }
  }, [dispatch]);

  const onPage = useCallback((p) => dispatch(setPage(p)), [dispatch]);

  return (
    <div>
      <SalesSummary />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Sales History</h1>
          <p className="text-gray-500 text-sm">{paging.total || 0} transactions</p>
        </div>
        <Link to="/pos" className="btn-primary">Open POS Terminal</Link>
      </div>
      <SalesFilters onSearch={refetch} />
      <SalesTable onVoid={onVoid} />
      <Pagination page={paging.page} pages={paging.pages} total={paging.total} onPage={onPage} />
    </div>
  );
}
