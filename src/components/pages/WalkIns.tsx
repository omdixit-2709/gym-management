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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
  InputAdornment,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowSelectionModel,
  GridToolbar,
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationsIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { WalkIn, WalkInStatus } from '../../types/walkIn';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  fetchWalkIns,
  setFilters,
  updateWalkIn,
  deleteWalkIn,
  deleteMultipleWalkIns,
} from '../../store/slices/walkInSlice';
import WalkInForm from '../walk-ins/WalkInForm';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { exportToExcel } from '../../services/walkInDataService';
import { showError, showSuccess, checkFollowUps } from '../../services/notificationService';
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
  const { refreshWalkIns } = useWalkIns();

  useEffect(() => {
    dispatch(fetchWalkIns());
  }, [dispatch]);

  // Add follow-up check effect
  useEffect(() => {
    // Initial check
    if (walkIns.length > 0) {
      checkFollowUps(walkIns);
    }

    // Set up interval to check every minute
    const intervalId = setInterval(() => {
      if (walkIns.length > 0) {
        checkFollowUps(walkIns);
      }
    }, 60000); // Check every minute

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [walkIns]);

  const handleStatusChange = async (walkIn: WalkIn, newStatus: WalkInStatus) => {
    try {
      await dispatch(updateWalkIn({
        id: walkIn.id!,
        data: {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        },
      }));
      showSuccess(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      showError('Failed to update status');
      console.error('Error updating status:', error);
    }
  };

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = (filter?: 'all' | 'today' | 'upcoming') => {
    try {
      const today = startOfDay(new Date());
      const nextWeek = endOfDay(addDays(today, 7));

      const walkInsToExport = walkIns.filter(walkIn => {
        const followUpDate = parseISO(walkIn.followUpDate);
        
        switch (filter) {
          case 'today':
            return isWithinInterval(followUpDate, { start: startOfDay(today), end: endOfDay(today) });
          case 'upcoming':
            return isWithinInterval(followUpDate, { start: today, end: nextWeek });
          default:
            return true;
        }
      });

      exportToExcel(walkInsToExport, `walk-ins-${filter || 'all'}`);
      showSuccess('Walk-ins exported successfully');
      handleExportMenuClose();
    } catch (error) {
      showError('Failed to export walk-ins');
      console.error('Export error:', error);
    }
  };

  const handleDelete = async () => {
    try {
      if (itemsToDelete.length === 1) {
        await dispatch(deleteWalkIn(itemsToDelete[0]));
      } else {
        await dispatch(deleteMultipleWalkIns(itemsToDelete));
      }
      setDeleteConfirmOpen(false);
      setItemsToDelete([]);
      setSelectedRows([]);
      refreshWalkIns();
      showSuccess(`Successfully deleted ${itemsToDelete.length} walk-in(s)`);
    } catch (error) {
      showError('Failed to delete walk-in(s)');
      console.error('Delete error:', error);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      renderCell: (params: GridRenderCellParams<WalkIn>) => (
        <Box>
          <Typography variant="body2">{params.row.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.email}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 150,
    },
    {
      field: 'visitDate',
      headerName: 'Visit Date',
      width: 120,
      valueGetter: (params) => format(parseISO(params.row.visitDate), 'dd/MM/yyyy'),
    },
    {
      field: 'followUpDate',
      headerName: 'Follow-up',
      width: 180,
      renderCell: (params: GridRenderCellParams<WalkIn>) => (
        <Box>
          <Typography variant="body2">
            {format(parseISO(params.row.followUpDate), 'dd/MM/yyyy')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.followUpTime}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'interestLevel',
      headerName: 'Interest',
      width: 120,
      renderCell: (params: GridRenderCellParams<WalkIn>) => (
        <Chip
          size="small"
          label={params.row.interestLevel}
          color={
            params.row.interestLevel === 'high'
              ? 'success'
              : params.row.interestLevel === 'medium'
              ? 'warning'
              : 'error'
          }
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params: GridRenderCellParams<WalkIn>) => (
        <Chip
          size="small"
          label={params.row.status.replace('_', ' ')}
          color={
            params.row.status === 'converted'
              ? 'success'
              : params.row.status === 'pending'
              ? 'warning'
              : 'error'
          }
        />
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
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setItemsToDelete([params.row.id!]);
                setDeleteConfirmOpen(true);
              }}
            >
              <DeleteIcon />
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

    let matchesDateRange = true;
    
    // Check date range only if both start and end dates are provided
    if (filters.dateRange.start && filters.dateRange.end) {
      try {
        const visitDate = parseISO(walkIn.visitDate);
        const startDate = parseISO(filters.dateRange.start);
        const endDate = parseISO(filters.dateRange.end);
        
        matchesDateRange = isWithinInterval(visitDate, {
          start: startDate,
          end: endDate,
        });
      } catch (error) {
        console.error('Error filtering by date range:', error);
        // If there's an error parsing dates, include the item
        matchesDateRange = true;
      }
    }

    return matchesStatus && matchesSearch && matchesDateRange;
  });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Typography variant="h5" component="h1">
              Walk-in Management
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<NotificationsIcon />}
                onClick={() => setShowFollowUps(!showFollowUps)}
                color={showFollowUps ? 'primary' : 'inherit'}
              >
                Follow-ups
              </Button>
              <Button
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
            </Box>
          </Box>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by name, phone, or email"
                value={filters.searchQuery}
                onChange={(e) => dispatch(setFilters({ searchQuery: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
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

            <Grid item xs={12} md={3}>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <DatePicker
                    label="Visit Date From"
                    value={filters.dateRange.start ? parseISO(filters.dateRange.start) : null}
                    onChange={(date) =>
                      dispatch(
                        setFilters({
                          dateRange: {
                            ...filters.dateRange,
                            start: date ? format(date, 'yyyy-MM-dd') : null,
                          },
                        })
                      )
                    }
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                        InputProps: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarIcon />
                            </InputAdornment>
                          ),
                        },
                      },
                    }}
                  />
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <DatePicker
                    label="Visit Date To"
                    value={filters.dateRange.end ? parseISO(filters.dateRange.end) : null}
                    onChange={(date) =>
                      dispatch(
                        setFilters({
                          dateRange: {
                            ...filters.dateRange,
                            end: date ? format(date, 'yyyy-MM-dd') : null,
                          },
                        })
                      )
                    }
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                        InputProps: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarIcon />
                            </InputAdornment>
                          ),
                        },
                      },
                    }}
                    minDate={filters.dateRange.start ? parseISO(filters.dateRange.start) : undefined}
                  />
                </Box>
                {(filters.dateRange.start || filters.dateRange.end) && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={() => 
                      dispatch(
                        setFilters({
                          dateRange: {
                            start: null,
                            end: null,
                          },
                        })
                      )
                    }
                  >
                    Clear Dates
                  </Button>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={2}>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<ImportIcon />}
                  onClick={() => setIsImportDialogOpen(true)}
                >
                  Import
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={handleExportMenuOpen}
                  disabled={walkIns.length === 0}
                >
                  Export
                </Button>
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
                    Upcoming Follow-ups
                  </MenuItem>
                </Menu>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ flexGrow: 1 }}>
        <Box display="flex" height="100%">
          <Box flexGrow={1}>
            <DataGrid
              rows={filteredWalkIns}
              columns={columns}
              loading={loading}
              checkboxSelection
              disableRowSelectionOnClick
              onRowSelectionModelChange={setSelectedRows}
              rowSelectionModel={selectedRows}
              slots={{ toolbar: GridToolbar }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 500 },
                },
              }}
              sx={{
                height: '100%',
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
              }}
            />
          </Box>
          {showFollowUps && (
            <>
              <Divider orientation="vertical" flexItem />
              <Box width={400} p={2} sx={{ overflowY: 'auto' }}>
                <FollowUpManager walkIns={walkIns} />
              </Box>
            </>
          )}
        </Box>
      </Paper>

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
          setIsImportDialogOpen(false);
          refreshWalkIns();
        }}
      />

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {itemsToDelete.length === 1 ? 'this walk-in' : `these ${itemsToDelete.length} walk-ins`}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer />
    </Box>
  );
};

export default WalkIns; 