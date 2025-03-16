import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import AddMemberDialog from './AddMemberDialog';
import { useMembers } from '../../hooks/useMembers';
import { Member } from '../../types/member';

const Members: React.FC = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const { members, loading, error, refreshMembers } = useMembers();

  const handleDelete = async () => {
    if (!selectedMember?.id) return;
    
    try {
      await deleteDoc(doc(db, 'members', selectedMember.id));
      setShowDeleteDialog(false);
      setSelectedMember(null);
      refreshMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  const handleAddSuccess = () => {
    refreshMembers();
  };

  const columns: GridColDef[] = [
    {
      field: 'photoUrl',
      headerName: 'Photo',
      width: 100,
      renderCell: (params) => (
        <img
          src={params.value}
          alt={`${params.row.firstName} ${params.row.lastName}`}
          style={{ width: 40, height: 40, borderRadius: '50%' }}
        />
      ),
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      valueGetter: (params) => `${params.row.firstName} ${params.row.lastName}`,
    },
    { field: 'phone', headerName: 'Phone', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    {
      field: 'joinDate',
      headerName: 'Join Date',
      width: 150,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'subscriptionType',
      headerName: 'Subscription',
      width: 150,
      valueFormatter: (params) => 
        params.value.charAt(0).toUpperCase() + params.value.slice(1),
    },
    {
      field: 'subscriptionEndDate',
      headerName: 'End Date',
      width: 150,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'paymentStatus',
      headerName: 'Payment Status',
      width: 150,
      valueFormatter: (params) => 
        params.value.charAt(0).toUpperCase() + params.value.slice(1),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 120,
      valueFormatter: (params) => params.value ? 'Active' : 'Inactive',
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setShowAddDialog(true)}
        >
          Add Member
        </Button>
        {selectedMember && (
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete Member
          </Button>
        )}
      </Box>

      <DataGrid
        rows={members}
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
        onRowSelectionModelChange={(newSelection: GridRowSelectionModel) => {
          const selected = members.find((member: Member) => member.id === newSelection[0]);
          setSelectedMember(selected || null);
        }}
        sx={{
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
        }}
      />

      <AddMemberDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={handleAddSuccess}
      />

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {selectedMember?.firstName} {selectedMember?.lastName}?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Members; 