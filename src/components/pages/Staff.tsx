import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Paper,
  Typography,
  useTheme,
  CircularProgress,
  Button,
  IconButton,
  Tooltip,
  Stack,
  Menu,
  MenuItem,
  alpha,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Alert,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { format, parseISO } from 'date-fns';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  fetchStaff,
  fetchStaffAttendance,
  calculateMonthlyAttendance,
  updateLastUpdated,
  deleteStaff,
} from '../../store/slices/staffSlice';
import StaffFiltersComponent from '../staff/StaffFilters';
import StaffFormDialog from '../staff/StaffFormDialog';
import AttendanceDialog from '../staff/AttendanceDialog';
import ImportStaffDialog from '../staff/ImportStaffDialog';
import { StaffMember, StaffFilters } from '../../types/staff';
import { exportToExcel } from '../../services/staffDataService';

const Staff: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const {
    staff,
    monthlyAttendance,
    biometricDevice: deviceState,
    loading,
    error,
    lastUpdated,
    filters
  } = useSelector((state: RootState) => state.staff || {
    staff: [],
    monthlyAttendance: [],
    biometricDevice: { isConnected: false, deviceInfo: null, error: null },
    loading: false,
    error: null,
    lastUpdated: null,
    filters: {}
  });

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [openStaffForm, setOpenStaffForm] = useState(false);
  const [openAttendance, setOpenAttendance] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    staffId: string | null;
    staffName: string;
  }>({ open: false, staffId: null, staffName: '' });

  useEffect(() => {
    dispatch(fetchStaff(filters));
    const currentDate = new Date();
    dispatch(calculateMonthlyAttendance({
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    }));
  }, [dispatch, filters]);

  const handleRefresh = () => {
    dispatch(fetchStaff(filters));
    dispatch(updateLastUpdated());
  };

  const handleStaffClick = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setOpenStaffForm(true);
  };

  const handleAttendanceClick = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setOpenAttendance(true);
  };

  const handleDialogClose = () => {
    setSelectedStaff(null);
    setOpenStaffForm(false);
    setOpenAttendance(false);
    // Refresh the staff list after dialog closes
    handleRefresh();
  };

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = (filter?: 'active' | 'inactive' | 'all') => {
    try {
      const staffToExport = staff.filter(member => {
        switch (filter) {
          case 'active':
            return member.isActive;
          case 'inactive':
            return !member.isActive;
          default:
            return true;
        }
      });

      exportToExcel(staffToExport, `staff-${filter || 'all'}`);
      handleExportMenuClose();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleFetchAttendance = async (filters: StaffFilters) => {
    try {
      const date = filters.dateRange?.start || format(new Date(), 'yyyy-MM-dd');
      await dispatch(fetchStaffAttendance(date)).unwrap();
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const handleDeleteClick = (staffId: string, staffName: string) => {
    setDeleteDialog({ open: true, staffId, staffName });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.staffId) {
      try {
        await dispatch(deleteStaff(deleteDialog.staffId)).unwrap();
        setDeleteDialog({ open: false, staffId: null, staffName: '' });
      } catch (error) {
        console.error('Failed to delete staff member:', error);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, staffId: null, staffName: '' });
  };

  const columns: GridColDef[] = [
    {
      field: 'photoUrl',
      headerName: 'Photo',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Avatar src={params.value} alt={params.row.firstName}>
          {params.row.firstName[0]}
        </Avatar>
      ),
    },
    {
      field: 'firstName',
      headerName: 'First Name',
      flex: 1,
    },
    {
      field: 'lastName',
      headerName: 'Last Name',
      flex: 1,
    },
    {
      field: 'designation',
      headerName: 'Designation',
      flex: 1,
    },
    {
      field: 'attendance',
      headerName: 'Monthly Attendance',
      width: 200,
      renderCell: (params: GridRenderCellParams) => {
        const staffStats = monthlyAttendance.find(
          (stats: { staffId: string }) => stats.staffId === params.row.id
        );
        if (!staffStats) return '-';
        
        const attendanceRate = (staffStats.presentDays / staffStats.totalWorkingDays) * 100;
        return (
          <Box sx={{ width: '100%' }}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption">
                {staffStats.presentDays}/{staffStats.totalWorkingDays} days
              </Typography>
              <Typography variant="caption" color={
                attendanceRate >= 90 ? 'success.main' :
                attendanceRate >= 75 ? 'warning.main' : 'error.main'
              }>
                {attendanceRate.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={attendanceRate}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: attendanceRate >= 90 ? 'success.main' :
                          attendanceRate >= 75 ? 'warning.main' : 'error.main',
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Stack 
          direction="row" 
          spacing={1} 
          sx={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}
        >
          <Tooltip title="Record Attendance" arrow>
            <IconButton
              size="small"
              onClick={() => handleAttendanceClick(params.row)}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.lighter',
                  color: 'primary.dark'
                }
              }}
            >
              <FingerprintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Staff" arrow>
            <IconButton
              size="small"
              onClick={() => handleStaffClick(params.row)}
              sx={{
                color: 'info.main',
                '&:hover': {
                  backgroundColor: 'info.lighter',
                  color: 'info.dark'
                }
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Staff" arrow>
            <IconButton
              size="small"
              onClick={() => handleDeleteClick(params.row.id!, `${params.row.firstName} ${params.row.lastName}`)}
              sx={{
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.lighter',
                  color: 'error.dark'
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  if (loading && !staff.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">
          Staff Management
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {format(parseISO(lastUpdated), 'HH:mm:ss')}
            </Typography>
          )}
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportMenuOpen}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={() => setOpenImport(true)}
          >
            Import
          </Button>
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => {
              setSelectedStaff(null);
              setOpenStaffForm(true);
            }}
          >
            Add Staff
          </Button>
        </Stack>
      </Box>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
      >
        <MenuItem onClick={() => handleExport('all')}>All Staff</MenuItem>
        <MenuItem onClick={() => handleExport('active')}>Active Staff</MenuItem>
        <MenuItem onClick={() => handleExport('inactive')}>Inactive Staff</MenuItem>
      </Menu>

      {/* Biometric Device Status */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: deviceState.isConnected ? 
        alpha(theme.palette.success.main, 0.1) : 
        alpha(theme.palette.error.main, 0.1) 
      }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FingerprintIcon color={deviceState.isConnected ? "success" : "error"} />
          <Box>
            <Typography variant="subtitle1">
              Device Status: {deviceState.isConnected ? 'Connected' : 'Not Connected'}
            </Typography>
            {deviceState.deviceInfo && (
              <Typography variant="caption" color="text.secondary">
                ({deviceState.deviceInfo.name} - {deviceState.deviceInfo.type})
              </Typography>
            )}
          </Box>
          {deviceState.error && (
            <Typography color="error" variant="caption">
              Error: {deviceState.error}
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* Filters */}
      <StaffFiltersComponent />

      {/* Staff Grid */}
      <Paper sx={{ height: 600, width: '100%', mt: 3 }}>
        <DataGrid
          rows={staff}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
              },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          checkboxSelection
          disableRowSelectionOnClick
          components={{
            Toolbar: GridToolbar,
          }}
          componentsProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
        />
      </Paper>

      {/* Dialogs */}
      <StaffFormDialog
        open={openStaffForm}
        onClose={handleDialogClose}
        staff={selectedStaff}
      />
      <AttendanceDialog
        open={openAttendance}
        onClose={handleDialogClose}
        staff={selectedStaff}
      />
      <ImportStaffDialog
        open={openImport}
        onClose={() => setOpenImport(false)}
        onSuccess={() => {
          setOpenImport(false);
          handleRefresh();
        }}
      />

      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            minWidth: '400px',
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'error.light',
          color: 'error.main',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <DeleteIcon />
          Delete Staff Member
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteDialog.staffName}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ 
          p: 2,
          gap: 1
        }}>
          <Button 
            onClick={handleDeleteCancel}
            variant="outlined"
            sx={{ 
              minWidth: '100px',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'primary.light'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            sx={{ 
              minWidth: '100px',
              '&:hover': {
                backgroundColor: 'error.dark'
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Staff; 