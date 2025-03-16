import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Typography,
  Menu,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
} from '@mui/icons-material';
import { WalkIn, WalkInStatus } from '../../types/walkIn';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  fetchWalkIns,
  setFilters,
  updateWalkIn,
} from '../../store/slices/walkInSlice';
import WalkInForm from '../walk-ins/WalkInForm';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { exportToExcel, importFromExcel } from '../../services/walkInDataService';
import { showError } from '../../services/notificationService';
import FollowUpManager from '../walk-ins/FollowUpManager';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ImportWalkInsDialog from '../walk-ins/ImportWalkInsDialog';
import { useWalkIns } from '../../hooks/useWalkIns';
import { addDays } from 'date-fns';

const statusOptions: { value: WalkInStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'converted', label: 'Converted' },
  { value: 'not_interested', label: 'Not Interested' },
];

const WalkIns: React.FC = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { walkIns, loading, filters } = useSelector((state: RootState) => state.walkIns);
  const [selectedWalkIn, setSelectedWalkIn] = useState<WalkIn | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const { refreshWalkIns } = useWalkIns();

  useEffect(() => {
    dispatch(fetchWalkIns());
  }, [dispatch]);

  const handleStatusChange = async (walkIn: WalkIn, newStatus: WalkInStatus) => {
    try {
      await dispatch(updateWalkIn({
        id: walkIn.id!,
        data: {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        },
      }));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importFromExcel(file);
      dispatch(fetchWalkIns());
    } catch (error) {
      showError('Failed to import walk-ins');
      console.error('Import error:', error);
    }
  };

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = (filter?: 'all' | 'today' | 'upcoming') => {
    const today = new Date();
    const nextWeek = addDays(today, 7);

    const walkInsToExport = walkIns.filter(walkIn => {
      const followUpDate = new Date(walkIn.followUpDate);
      
      switch (filter) {
        case 'today':
          return format(followUpDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        case 'upcoming':
          return followUpDate > today && followUpDate <= nextWeek;
        default:
          return true;
      }
    });

    exportToExcel(walkInsToExport, `walk-ins-${filter || 'all'}`);
    handleExportMenuClose();
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 150,
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 200,
    },
    {
      field: 'visitDate',
      headerName: 'Visit Date',
      width: 120,
      valueGetter: (params) => format(parseISO(params.row.visitDate), 'dd/MM/yyyy'),
    },
    {
      field: 'followUpDate',
      headerName: 'Follow-up Date',
      width: 120,
      valueGetter: (params) =>
        `${format(parseISO(params.row.followUpDate), 'dd/MM/yyyy')} ${params.row.followUpTime}`,
    },
    {
      field: 'interestLevel',
      headerName: 'Interest',
      width: 120,
      renderCell: (params: GridRenderCellParams<WalkIn>) => (
        <Box
          sx={{
            backgroundColor:
              params.row.interestLevel === 'high'
                ? 'success.light'
                : params.row.interestLevel === 'medium'
                ? 'warning.light'
                : 'error.light',
            color: 'white',
            px: 2,
            py: 0.5,
            borderRadius: 1,
            textTransform: 'capitalize',
          }}
        >
          {params.row.interestLevel}
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params: GridRenderCellParams<WalkIn>) => (
        <Box
          sx={{
            backgroundColor:
              params.row.status === 'converted'
                ? 'success.light'
                : params.row.status === 'pending'
                ? 'warning.light'
                : 'error.light',
            color: 'white',
            px: 2,
            py: 0.5,
            borderRadius: 1,
            textTransform: 'capitalize',
          }}
        >
          {params.row.status.replace('_', ' ')}
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params: GridRenderCellParams<WalkIn>) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedWalkIn(params.row);
                setIsEditMode(true);
                setIsFormOpen(true);
              }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          {params.row.status === 'pending' && (
            <>
              <Tooltip title="Mark as Converted">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => handleStatusChange(params.row, 'converted')}
                >
                  <CheckCircleIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Mark as Not Interested">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleStatusChange(params.row, 'not_interested')}
                >
                  <CancelIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];

  const filteredWalkIns = walkIns.filter((walkIn) => {
    const matchesStatus =
      filters.status === 'all' || walkIn.status === filters.status;

    const matchesSearch = !filters.searchQuery
      ? true
      : walkIn.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        walkIn.phone.includes(filters.searchQuery) ||
        walkIn.email?.toLowerCase().includes(filters.searchQuery.toLowerCase());

    const matchesDateRange =
      !filters.dateRange.start || !filters.dateRange.end
        ? true
        : isWithinInterval(parseISO(walkIn.visitDate), {
            start: parseISO(filters.dateRange.start),
            end: parseISO(filters.dateRange.end),
          });

    return matchesStatus && matchesSearch && matchesDateRange;
  });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Search"
                value={filters.searchQuery}
                onChange={(e) =>
                  dispatch(setFilters({ searchQuery: e.target.value }))
                }
                placeholder="Search by name, email, or phone"
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="From Date"
                type="date"
                value={filters.dateRange.start || ''}
                onChange={(e) =>
                  dispatch(
                    setFilters({
                      dateRange: { ...filters.dateRange, start: e.target.value },
                    })
                  )
                }
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="To Date"
                type="date"
                value={filters.dateRange.end || ''}
                onChange={(e) =>
                  dispatch(
                    setFilters({
                      dateRange: { ...filters.dateRange, end: e.target.value },
                    })
                  )
                }
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Status"
                value={filters.status}
                onChange={(e) =>
                  dispatch(
                    setFilters({ status: e.target.value as WalkInStatus | 'all' })
                  )
                }
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={2}>
              <Box display="flex" gap={1}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedWalkIn(undefined);
                    setIsEditMode(false);
                    setIsFormOpen(true);
                  }}
                >
                  Add Walk-in
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ImportIcon />}
                  onClick={() => setIsImportDialogOpen(true)}
                >
                  Import
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ExportIcon />}
                  onClick={handleExportMenuOpen}
                  disabled={walkIns.length === 0}
                >
                  Export
                </Button>
                {selectedRows.length > 0 && (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => {/* Handle delete */}}
                  >
                    Delete ({selectedRows.length})
                  </Button>
                )}
                <Menu
                  anchorEl={exportMenuAnchor}
                  open={Boolean(exportMenuAnchor)}
                  onClose={handleExportMenuClose}
                >
                  <MenuItem onClick={() => handleExport('all')}>
                    All Walk-ins
                  </MenuItem>
                  <MenuItem onClick={() => handleExport('today')}>
                    Today's Follow-ups
                  </MenuItem>
                  <MenuItem onClick={() => handleExport('upcoming')}>
                    Upcoming Follow-ups (7 days)
                  </MenuItem>
                </Menu>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {showFollowUps ? (
        <FollowUpManager walkIns={walkIns} />
      ) : (
        <DataGrid
          rows={filteredWalkIns}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id!}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
              },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
          checkboxSelection
          onRowSelectionModelChange={(newSelection) => {
            setSelectedRows(newSelection);
            const selected = walkIns.find((walkIn) => walkIn.id === newSelection[0]);
            setSelectedWalkIn(selected);
          }}
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      )}

      <WalkInForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedWalkIn(undefined);
          setIsEditMode(false);
        }}
        walkIn={selectedWalkIn}
        isEdit={isEditMode}
      />

      <ImportWalkInsDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={() => {
          refreshWalkIns();
          setIsImportDialogOpen(false);
        }}
      />

      <ToastContainer />
    </Box>
  );
};

export default WalkIns; 