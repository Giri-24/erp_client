import axios from '../../utils/axios';

export const getMasterDashboardSummary = async () => {
  const res = await axios.get('/dashboard/master-summary');
  return res.data;
};
