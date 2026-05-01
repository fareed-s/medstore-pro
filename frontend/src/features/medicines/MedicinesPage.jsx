import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import {
  fetchMedicines, selectMedicinesFilters, selectMedicinesPaging, setPage,
} from './medicinesSlice';
import MedicineHeader from './components/MedicineHeader';
import MedicineFilters from './components/MedicineFilters';
import MedicineTable from './components/MedicineTable';
import BulkImportModal from './components/BulkImportModal';
import Pagination from '../../shared/components/Pagination';

export default function MedicinesPage() {
  const dispatch = useDispatch();
  const filters = useSelector(selectMedicinesFilters, shallowEqual);
  const paging  = useSelector(selectMedicinesPaging,  shallowEqual);

  const [showBulk, setShowBulk] = useState(false);

  const refetch = useCallback(() => {
    dispatch(fetchMedicines(filters));
  }, [dispatch, filters]);

  useEffect(() => { refetch(); }, [refetch]);

  const onPage      = useCallback((p) => dispatch(setPage(p)), [dispatch]);
  const openBulk    = useCallback(() => setShowBulk(true),  []);
  const closeBulk   = useCallback(() => setShowBulk(false), []);

  return (
    <div>
      <MedicineHeader total={paging.total} onBulkImport={openBulk} />
      <MedicineFilters onSearch={refetch} />
      <MedicineTable />
      <Pagination page={paging.page} pages={paging.pages} total={paging.total} onPage={onPage} />
      {showBulk && <BulkImportModal onClose={closeBulk} />}
    </div>
  );
}
