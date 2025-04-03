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
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
  Paper,
  Stack,
  Divider,
  Chip,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridValueGetterParams,
  GridRenderCellParams,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import {
  Edit as EditIcon,
  Visibility as ViewIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PeopleAlt as PeopleIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { Member, SubscriptionType } from '../../types/member';
import { fetchMembers, setFilters } from '../../store/slices/memberSlice';
import type { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import ImportMembersDialog from '../members/ImportMembersDialog';
import ViewMemberDialog from '../members/ViewMemberDialog';
import EditMemberDialog from '../members/EditMemberDialog';
import { addDays, format, parseISO, isWithinInterval, isBefore, endOfMonth, addMonths, differenceInDays, startOfToday } from 'date-fns';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import AddMemberDialog from '../members/AddMemberDialog';

const subscriptionTypes: SubscriptionType[] = ['monthly', 'quarterly', 'semi-annual', 'annual'];
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

const formatDateForCSV = (dateString: string) => {
  return format(new Date(dateString), 'dd/MM/yyyy');
};

const escapeCSV = (str: string) => {
  if (!str) return '';
  str = str.toString();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Define the type for CSV row with index signature
interface CsvRow {
  'Sr. No.': string;
  'Name': string;
  'Email': string;
  'Phone': string;
  'Join Date': string;
  'Subscription Type': string;
  'End Date': string;
  'Payment Status': string;
  'Days Until Expiry': number;
  'Status': string;
  [key: string]: string | number; // Add index signature
}

// Summary card interface
interface SummaryCard {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  exportOptions: Array<{
    label: string;
    filter: (member: Member) => boolean;
    filename: string;
  }>;
}

const Members: React.FC = () => {
  const dispatch = useAppDispatch();
  const { members, loading, filters } = useSelector((state: RootState) => state.members);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [summaryExportMenuAnchor, setSummaryExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedSummary, setSelectedSummary] = useState<SummaryCard | null>(null);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);

  useEffect(() => {
    dispatch(fetchMembers());
  }, [dispatch]);

  const columns: GridColDef<Member>[] = [
    {
      field: 'photoUrl',
      headerName: 'Photo',
      width: 100,
      renderCell: (params) => (
        <Box
          component="img"
          sx={{
            height: 40,
            width: 40,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
          src={params.row.photoUrl || '/default-avatar.png'}
          alt="Member"
        />
      ),
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      valueGetter: (params) =>
        `${params.row.firstName} ${params.row.lastName}`,
    },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phone', headerName: 'Phone', width: 150 },
    {
      field: 'joinDate',
      headerName: 'Join Date',
      width: 150,
      valueGetter: (params) =>
        format(new Date(params.row.joinDate), 'PP'),
    },
    {
      field: 'subscriptionType',
      headerName: 'Subscription',
      width: 150,
      valueFormatter: (params: { value: SubscriptionType }) =>
        String(params.value).charAt(0).toUpperCase() + String(params.value).slice(1),
    },
    {
      field: 'subscriptionEndDate',
      headerName: 'End Date',
      width: 150,
      valueGetter: (params) =>
        format(new Date(params.row.subscriptionEndDate), 'PP'),
    },
    {
      field: 'paymentStatus',
      headerName: 'Payment Status',
      width: 150,
      renderCell: (params: GridRenderCellParams<Member>) => (
        <Chip
          label={params.row.paymentStatus.toUpperCase()}
          color={
            params.row.paymentStatus === 'paid'
              ? 'success'
              : params.row.paymentStatus === 'pending'
              ? 'warning'
              : 'error'
          }
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      field: 'daysUntilExpiry',
      headerName: 'Days Until Expiry',
      width: 150,
      valueGetter: (params) => {
        const today = startOfToday();
        const endDate = new Date(params.row.subscriptionEndDate);
        const days = differenceInDays(endDate, today);
        return days;
      },
      renderCell: (params: GridRenderCellParams<Member>) => {
        const days = params.value as number;
        return (
          <Chip
            label={days < 0 ? 'Expired' : `${days} days`}
            color={
              days < 0
                ? 'error'
                : days <= 7
                ? 'warning'
                : 'success'
            }
            size="small"
            variant={days < 0 ? 'filled' : 'outlined'}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View">
            <IconButton
              size="small"
              onClick={() => handleViewMember(params.row)}
            >
              <ViewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => handleEditMember(params.row)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const handleViewMember = (member: Member) => {
    setSelectedMember(member);
    setIsViewDialogOpen(true);
  };

  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setIsEditDialogOpen(true);
  };

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleSummaryExportMenuOpen = (event: React.MouseEvent<HTMLElement>, summary: SummaryCard) => {
    setSelectedSummary(summary);
    setSummaryExportMenuAnchor(event.currentTarget);
  };

  const handleSummaryExportMenuClose = () => {
    setSummaryExportMenuAnchor(null);
    setSelectedSummary(null);
  };

  const exportMembers = (filter?: 'all' | 'expiring-soon' | 'expired' | ((member: Member) => boolean), filename?: string) => {
    const today = new Date();
    const nextWeek = addDays(today, 7);

    const membersToExport = members.filter(member => {
      if (typeof filter === 'function') {
        return filter(member);
      }

      const endDate = parseISO(member.subscriptionEndDate);
      
      switch (filter) {
        case 'expiring-soon':
          return endDate > today && endDate <= nextWeek;
        case 'expired':
          return endDate < today;
        default:
          return true;
      }
    });

    const csvData = membersToExport.map((member) => ({
      'Sr. No.': '',
      'Name': `${member.firstName} ${member.lastName}`,
      'Email': member.email,
      'Phone': member.phone,
      'Join Date': formatDateForCSV(member.joinDate),
      'Subscription Type': member.subscriptionType.charAt(0).toUpperCase() + member.subscriptionType.slice(1),
      'End Date': formatDateForCSV(member.subscriptionEndDate),
      'Payment Status': member.paymentStatus.toUpperCase(),
      'Days Until Expiry': Math.ceil(
        (new Date(member.subscriptionEndDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      ),
      'Status': member.isActive ? 'Active' : 'Inactive'
    }));

    // Add serial numbers
    csvData.forEach((row, index) => {
      row['Sr. No.'] = (index + 1).toString();
    });

    // Create CSV content with proper escaping
    const headers = Object.keys(csvData[0]);
    const csv = [
      headers.map(header => escapeCSV(header)).join(','),
      ...csvData.map(row =>
        headers.map(header => escapeCSV((row as any)[header])).join(',')
      )
    ].join('\n');

    // Add BOM for Excel to properly detect UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = format(new Date(), 'dd-MM-yyyy');
    const fileLabel = filename || (filter === 'expiring-soon' ? 'expiring-this-week' : filter || 'all');
    a.download = `members-${fileLabel}-${timestamp}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    handleExportMenuClose();
    handleSummaryExportMenuClose();
  };

  const handleDeleteMembers = async () => {
    try {
      // Delete selected members
      for (const id of selectedRows) {
        const memberRef = doc(db, 'members', id.toString());
        await deleteDoc(memberRef);
      }
      setIsDeleteDialogOpen(false);
      setSelectedRows([]);
      dispatch(fetchMembers()); // Refresh the list
    } catch (error) {
      console.error('Error deleting members:', error);
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSubscription =
      filters.subscriptionType === 'all' ||
      member.subscriptionType === filters.subscriptionType;

    const matchesSearch =
      !filters.searchQuery ||
      `${member.firstName} ${member.lastName}`
        .toLowerCase()
        .includes(filters.searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      member.phone.includes(filters.searchQuery);

    const matchesRenewal =
      !filters.renewalMonth ||
      new Date(member.subscriptionEndDate).getMonth() + 1 === filters.renewalMonth;

    return matchesSubscription && matchesSearch && matchesRenewal;
  });

  // Calculate summary data
  const today = startOfToday();
  const nextWeek = addDays(today, 7);
  const endOfCurrentMonth = endOfMonth(today);

  // Prepare summary cards
  const summaryCards: SummaryCard[] = [
    {
      title: 'Total Members',
      count: members.length,
      icon: <PeopleIcon fontSize="large" />,
      color: 'primary.main',
      exportOptions: [
        {
          label: 'All Members',
          filter: () => true,
          filename: 'all-members'
        },
        {
          label: 'Active Members',
          filter: (member) => member.isActive,
          filename: 'active-members'
        },
        {
          label: 'Inactive Members',
          filter: (member) => !member.isActive,
          filename: 'inactive-members'
        }
      ]
    },
    {
      title: 'Expiring Soon',
      count: members.filter(member => {
        const endDate = parseISO(member.subscriptionEndDate);
        return isWithinInterval(endDate, { start: today, end: endOfCurrentMonth });
      }).length,
      icon: <CalendarIcon fontSize="large" />,
      color: 'warning.main',
      exportOptions: [
        {
          label: 'Expiring in 3 Days',
          filter: (member) => {
            const endDate = parseISO(member.subscriptionEndDate);
            return isWithinInterval(endDate, { start: today, end: addDays(today, 3) });
          },
          filename: 'expiring-in-3-days'
        },
        {
          label: 'Expiring in 7 Days',
          filter: (member) => {
            const endDate = parseISO(member.subscriptionEndDate);
            return isWithinInterval(endDate, { start: today, end: addDays(today, 7) });
          },
          filename: 'expiring-in-7-days'
        },
        {
          label: 'Expiring This Month',
          filter: (member) => {
            const endDate = parseISO(member.subscriptionEndDate);
            return isWithinInterval(endDate, { start: today, end: endOfCurrentMonth });
          },
          filename: 'expiring-this-month'
        }
      ]
    },
    {
      title: 'Expired Memberships',
      count: members.filter(member => {
        const endDate = parseISO(member.subscriptionEndDate);
        return isBefore(endDate, today);
      }).length,
      icon: <WarningIcon fontSize="large" />,
      color: 'error.main',
      exportOptions: [
        {
          label: 'Expired Today',
          filter: (member) => {
            const endDate = parseISO(member.subscriptionEndDate);
            return isBefore(endDate, today) && differenceInDays(today, endDate) <= 1;
          },
          filename: 'expired-today'
        },
        {
          label: 'Expired This Week',
          filter: (member) => {
            const endDate = parseISO(member.subscriptionEndDate);
            return isBefore(endDate, today) && differenceInDays(today, endDate) <= 7;
          },
          filename: 'expired-this-week'
        },
        {
          label: 'All Expired Memberships',
          filter: (member) => {
            const endDate = parseISO(member.subscriptionEndDate);
            return isBefore(endDate, today);
          },
          filename: 'all-expired'
        }
      ]
    },
    {
      title: 'Pending Payments',
      count: members.filter(member => member.paymentStatus !== 'paid').length,
      icon: <PaymentIcon fontSize="large" />,
      color: 'info.main',
      exportOptions: [
        {
          label: 'Pending Payments',
          filter: (member) => member.paymentStatus === 'pending',
          filename: 'pending-payments'
        },
        {
          label: 'Overdue Payments',
          filter: (member) => member.paymentStatus === 'overdue',
          filename: 'overdue-payments'
        },
        {
          label: 'All Unpaid Members',
          filter: (member) => member.paymentStatus !== 'paid',
          filename: 'all-unpaid'
        }
      ]
    }
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
      {/* Summary Cards */}
      <Grid container spacing={2} mb={2}>
        {summaryCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 4
                }
              }}
              onClick={(e) => handleSummaryExportMenuOpen(e, card)}
            >
              <CardContent>
                <Stack 
                  direction="row" 
                  justifyContent="space-between" 
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="h6" color="text.secondary">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {card.count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Click to export
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      backgroundColor: card.color, 
                      p: 1.5, 
                      borderRadius: 2,
                      color: 'white'
                    }}
                  >
                    {card.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Export menu for summary cards */}
      <Menu
        anchorEl={summaryExportMenuAnchor}
        open={Boolean(summaryExportMenuAnchor)}
        onClose={handleSummaryExportMenuClose}
      >
        {selectedSummary?.exportOptions.map((option, index) => (
          <MenuItem key={index} onClick={() => exportMembers(option.filter, option.filename)}>
            {option.label}
          </MenuItem>
        ))}
      </Menu>

      {/* Filters and Actions Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                label="Subscription Type"
                value={filters.subscriptionType}
                onChange={(e) =>
                  dispatch(setFilters({ subscriptionType: e.target.value as SubscriptionType | 'all' }))
                }
              >
                <MenuItem value="all">All Types</MenuItem>
                {subscriptionTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={3}>
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

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                label="Renewal Month"
                value={filters.renewalMonth || ''}
                onChange={(e) =>
                  dispatch(
                    setFilters({
                      renewalMonth: e.target.value ? Number(e.target.value) : null,
                    })
                  )
                }
              >
                <MenuItem value="">All Months</MenuItem>
                {months.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  Add Member
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
                  disabled={members.length === 0}
                >
                  Export
                </Button>
                {selectedRows.length > 0 && (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    Delete ({selectedRows.length})
                  </Button>
                )}
                <Menu
                  anchorEl={exportMenuAnchor}
                  open={Boolean(exportMenuAnchor)}
                  onClose={handleExportMenuClose}
                >
                  <MenuItem onClick={() => exportMembers('all')}>
                    All Members
                  </MenuItem>
                  <MenuItem onClick={() => exportMembers('expiring-soon')}>
                    Expiring Within 7 Days
                  </MenuItem>
                  <MenuItem onClick={() => exportMembers('expired')}>
                    Expired Memberships
                  </MenuItem>
                </Menu>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ flexGrow: 1, borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filteredMembers.map(member => ({
            ...member,
            id: member.id || `temp-${Math.random()}`
          }))}
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
          autoHeight
          onRowSelectionModelChange={(newSelection) => {
            setSelectedRows(newSelection);
            const selected = filteredMembers.find((member) => member.id === newSelection[0]);
            setSelectedMember(selected || null);
          }}
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Paper>

      <ImportMembersDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
      />

      <ViewMemberDialog
        open={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        member={selectedMember}
      />

      <EditMemberDialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        member={selectedMember}
      />

      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {selectedRows.length} selected member{selectedRows.length === 1 ? '' : 's'}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteMembers} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <AddMemberDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={() => {
          setIsAddDialogOpen(false);
          dispatch(fetchMembers());
        }}
      />
    </Box>
  );
};

export default Members; 