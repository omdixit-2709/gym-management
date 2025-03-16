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
} from '@mui/icons-material';
import { Member, SubscriptionType } from '../../types/member';
import { fetchMembers, setFilters } from '../../store/slices/memberSlice';
import type { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import ImportMembersDialog from '../members/ImportMembersDialog';
import ViewMemberDialog from '../members/ViewMemberDialog';
import EditMemberDialog from '../members/EditMemberDialog';
import { addDays, format, parseISO } from 'date-fns';
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

const Members: React.FC = () => {
  const dispatch = useAppDispatch();
  const { members, loading, filters } = useSelector((state: RootState) => state.members);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
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
        <Box
          sx={{
            backgroundColor:
              params.row.paymentStatus === 'paid'
                ? 'success.light'
                : params.row.paymentStatus === 'pending'
                ? 'warning.light'
                : 'error.light',
            color: 'white',
            px: 2,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          {params.row.paymentStatus.toUpperCase()}
        </Box>
      ),
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

  const exportMembers = (filter?: 'all' | 'expiring-soon' | 'expired') => {
    const today = new Date();
    const nextWeek = addDays(today, 7);

    const membersToExport = members.filter(member => {
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
      'Status': member.paymentStatus === 'paid' ? 'Active' : 'Pending'
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
    const filterLabel = filter === 'expiring-soon' ? 'expiring-this-week' : filter || 'all';
    a.download = `members-${filterLabel}-${timestamp}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    handleExportMenuClose();
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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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