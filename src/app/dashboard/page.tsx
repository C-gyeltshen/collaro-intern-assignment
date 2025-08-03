"use client";

import * as React from "react";
import {
  Box,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Chip,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  TablePagination,
  Card,
  CardContent,
  Skeleton,
  Tooltip,
  Button,
  Divider,
  Grid,
  Avatar,
  useTheme,
  alpha,
  Stack,
  InputAdornment,
  Fade,
  Zoom,
  Snackbar,
} from "@mui/material";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CancelIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as ShoppingCartIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  ErrorOutline as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

// Import your types and service functions
import { fetchCustomers, updateCustomerStatus } from "../shared/services/customerServices";
import { fetchOrdersByCustomerId, updateOrderItemCustomSize } from "../shared/services/orderServices";

// Enhanced Customer interface with better typing
interface CustomerType {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'churned' | 'prospect';
  revenue: number;
  orderCount: number;
  lastOrderDate: string | null;
}

// Status configuration for consistent styling
const statusConfig = {
  active: {
    color: 'success' as const,
    icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
    label: 'Active',
  },
  churned: {
    color: 'error' as const,
    icon: <ErrorIcon sx={{ fontSize: 16 }} />,
    label: 'Churned',
  },
  prospect: {
    color: 'warning' as const,
    icon: <WarningIcon sx={{ fontSize: 16 }} />,
    label: 'Prospect',
  },
};

// Enhanced Row component with improved animations and interactions
function Row({
  row,
  onStatusUpdate,
  onShowMessage,
}: {
  row: CustomerType;
  onStatusUpdate: (id: string, newStatus: CustomerType["status"]) => void;
  onShowMessage: (message: string, type: 'success' | 'error') => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [orders, setOrders] = React.useState<OrderType[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = React.useState(false);
  const [errorOrders, setErrorOrders] = React.useState<string | null>(null);
  
  const [editingStatus, setEditingStatus] = React.useState(false);
  const [statusDraft, setStatusDraft] = React.useState(row.status);
  const [itemEdits, setItemEdits] = React.useState<
    Record<string, { chest: number; waist: number; hips: number }>
  >({});
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [savingItemId, setSavingItemId] = React.useState<string | null>(null);

  const handleStatusSave = () => {
    onStatusUpdate(row.id, statusDraft);
    setEditingStatus(false);
  };

  const handleRowExpand = async () => {
    setOpen(!open);
    if (!open && orders.length === 0 && !isLoadingOrders) {
      setIsLoadingOrders(true);
      setErrorOrders(null);
      try {
        const fetchedOrders = await fetchOrdersByCustomerId(row.id);
        setOrders(fetchedOrders);
      } catch (error) {
        setErrorOrders("Failed to load order history.");
      } finally {
        setIsLoadingOrders(false);
      }
    }
  };

  const handleItemEdit = (orderId: string, itemIndex: number, item: any) => {
    setEditingItemId(`${orderId}-${itemIndex}`);
    setItemEdits((prev) => ({
      ...prev,
      [`${orderId}-${itemIndex}`]: { ...item.customSize },
    }));
  };

  const handleItemChange = (field: keyof any, value: number, itemKey: string) => {
    setItemEdits((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        [field]: value,
      },
    }));
  };

  const handleItemSave = async (itemKey: string) => {
    const [orderId, itemIndex] = itemKey.split('-');
    const itemIndexNum = parseInt(itemIndex);
    const order = orders.find(o => o.orderId === orderId);
    const item = order?.items[itemIndexNum];

    console.log('Component - handleItemSave called with:', {
    itemKey,
    orderId,
    itemIndex,
    itemIndexNum,
    order: order ? 'found' : 'not found',
    item: item ? 'found' : 'not found',
    itemEdits: itemEdits[itemKey]
  });
    
    if (!item || !itemEdits[itemKey]) {
      setEditingItemId(null);
      return;
    }

    setSavingItemId(itemKey);

    try {
      console.log('Component - Calling updateOrderItemCustomSize with:', {
      orderId: orderId,
      itemId: item.id,
      customSize: itemEdits[itemKey],
    });
      // Use the existing service function from orderServices.tsx
      const result = await updateOrderItemCustomSize({
        orderId: orderId,
        itemId: item.id,
        customSize: itemEdits[itemKey],
      });
      
      console.log('Component - Service result:', result);

      if (result.success && result.data) {
        // Update the local orders state with the new custom size
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.orderId === orderId
              ? {
                  ...order,
                  items: order.items.map((orderItem, index) =>
                    index === itemIndexNum
                      ? {
                          ...orderItem,
                          customSize: result.data.customSize,
                        }
                      : orderItem
                  ),
                }
              : order
          )
        );

        // Clear editing state
        setEditingItemId(null);
        setItemEdits(prev => {
          const newEdits = { ...prev };
          delete newEdits[itemKey];
          return newEdits;
        });

        onShowMessage('Custom measurements updated successfully', 'success');
      } else {
        throw new Error(result.error || 'Failed to update custom size');
      }
    } catch (error) {
      console.error('Error updating custom size:', error);
      onShowMessage(
        error instanceof Error ? error.message : 'Failed to update custom measurements',
        'error'
      );
    } finally {
      setSavingItemId(null);
    }
  };

  const handleItemCancel = (itemKey: string) => {
    setEditingItemId(null);
    setItemEdits(prev => {
      const newEdits = { ...prev };
      delete newEdits[itemKey];
      return newEdits;
    });
  };

  // Get user's initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <TableRow
        hover
        sx={{
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          },
          transition: 'background-color 0.2s ease',
        }}
      >
        <TableCell sx={{ width: 48 }}>
          <Tooltip title={open ? "Collapse details" : "Expand details"}>
            <IconButton
              size="small"
              onClick={handleRowExpand}
              sx={{
                transition: 'transform 0.2s ease',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <KeyboardArrowDownIcon />
            </IconButton>
          </Tooltip>
        </TableCell>
        
        <TableCell>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.75rem',
                bgcolor: theme.palette.primary.main,
              }}
            >
              {getInitials(row.name)}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600} color="text.primary">
                {row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {row.id.slice(-8)}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        
        <TableCell>
          <Typography variant="body2" color="text.primary">
            {row.email}
          </Typography>
        </TableCell>
        
        <TableCell>
          {editingStatus ? (
            <Fade in timeout={200}>
              <Box display="flex" alignItems="center" gap={1}>
                <Select
                  size="small"
                  value={statusDraft}
                  onChange={(e) =>
                    setStatusDraft(e.target.value as CustomerType["status"])
                  }
                  sx={{
                    minWidth: 120,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.paper',
                    },
                  }}
                >
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {config.icon}
                        {config.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <Tooltip title="Save changes">
                  <IconButton 
                    size="small" 
                    onClick={handleStatusSave}
                    color="primary"
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.2),
                      },
                    }}
                  >
                    <SaveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel">
                  <IconButton 
                    size="small" 
                    onClick={() => setEditingStatus(false)}
                    color="error"
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Fade>
          ) : (
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={statusConfig[row.status].label}
                color={statusConfig[row.status].color}
                size="small"
                icon={statusConfig[row.status].icon}
                sx={{
                  fontWeight: 500,
                  '& .MuiChip-icon': {
                    fontSize: 14,
                  },
                }}
              />
              <Tooltip title="Edit status">
                <IconButton 
                  size="small" 
                  onClick={() => setEditingStatus(true)}
                  sx={{
                    opacity: 0.7,
                    '&:hover': {
                      opacity: 1,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </TableCell>
        
        <TableCell align="right">
          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
            <MoneyIcon sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" fontWeight={600} color="text.primary">
              ${row.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
        </TableCell>
        
        <TableCell align="right">
          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
            <ShoppingCartIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" fontWeight={500}>
              {row.orderCount}
            </Typography>
          </Box>
        </TableCell>
        
        <TableCell align="right">
          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
            <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {row.lastOrderDate
                ? new Date(row.lastOrderDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : "No orders"}
            </Typography>
          </Box>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell 
          colSpan={7} 
          sx={{ 
            paddingBottom: 0, 
            paddingTop: 0,
            backgroundColor: alpha(theme.palette.grey[50], 0.5),
          }}
        >
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 3 }}>
              <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <ReceiptIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Order History
                    </Typography>
                  </Box>
                  
                  {isLoadingOrders ? (
                    <Box py={3}>
                      <Stack spacing={1}>
                        <Skeleton variant="rectangular" height={40} />
                        <Skeleton variant="rectangular" height={40} />
                        <Skeleton variant="rectangular" height={40} />
                      </Stack>
                    </Box>
                  ) : errorOrders ? (
                    <Alert 
                      severity="error" 
                      icon={<ErrorIcon />}
                      sx={{ borderRadius: 2 }}
                    >
                      {errorOrders}
                    </Alert>
                  ) : orders.length > 0 ? (
                    <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: alpha(theme.palette.grey[100], 0.8) }}>
                            <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} align="right">Total</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Items & Measurements</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {orders.map((order, orderIndex) => (
                            <TableRow 
                              key={order.orderId}
                              sx={{
                                '&:nth-of-type(odd)': {
                                  backgroundColor: alpha(theme.palette.grey[50], 0.3),
                                },
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                },
                              }}
                            >
                              <TableCell>
                                <Typography variant="body2" fontWeight={500} color="primary.main">
                                  #{order.orderId}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {new Date(order.orderDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={600} color="success.main">
                                  ${order.totalAmount.toFixed(2)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={1.5}>
                                  {order.items.map((item, itemIndex) => {
                                    const key = `${order.orderId}-${itemIndex}`;
                                    const isEditing = editingItemId === key;
                                    const isSaving = savingItemId === key;
                                    const size = isEditing ? itemEdits[key] : item.customSize;

                                    return (
                                      <Card 
                                        key={key} 
                                        variant="outlined" 
                                        sx={{ 
                                          p: 1.5,
                                          backgroundColor: 'background.paper',
                                          borderRadius: 1,
                                          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                        }}
                                      >
                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                          <Typography variant="body2" fontWeight={500}>
                                            {item.itemName}
                                          </Typography>
                                          {!isEditing && !isSaving && (
                                            <Tooltip title="Edit measurements">
                                              <IconButton 
                                                size="small" 
                                                onClick={() => handleItemEdit(order.orderId, itemIndex, item)}
                                                sx={{
                                                  opacity: 0.7,
                                                  '&:hover': { opacity: 1 },
                                                }}
                                              >
                                                <EditIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                          )}
                                        </Box>
                                        
                                        {isEditing ? (
                                          <Fade in timeout={200}>
                                            <Box>
                                              <Grid container spacing={1} mb={1}>
                                                <Grid item xs={4}>
                                                  <TextField
                                                    size="small"
                                                    label="Chest"
                                                    type="number"
                                                    value={size?.chest ?? ""}
                                                    onChange={(e) =>
                                                      handleItemChange("chest", Number(e.target.value), key)
                                                    }
                                                    InputProps={{
                                                      endAdornment: <InputAdornment position="end">in</InputAdornment>,
                                                    }}
                                                    inputProps={{
                                                      min: 0,
                                                      step: 0.1,
                                                    }}
                                                    fullWidth
                                                  />
                                                </Grid>
                                                <Grid item xs={4}>
                                                  <TextField
                                                    size="small"
                                                    label="Waist"
                                                    type="number"
                                                    value={size?.waist ?? ""}
                                                    onChange={(e) =>
                                                      handleItemChange("waist", Number(e.target.value), key)
                                                    }
                                                    InputProps={{
                                                      endAdornment: <InputAdornment position="end">in</InputAdornment>,
                                                    }}
                                                    inputProps={{
                                                      min: 0,
                                                      step: 0.1,
                                                    }}
                                                    fullWidth
                                                  />
                                                </Grid>
                                                <Grid item xs={4}>
                                                  <TextField
                                                    size="small"
                                                    label="Hips"
                                                    type="number"
                                                    value={size?.hips ?? ""}
                                                    onChange={(e) =>
                                                      handleItemChange("hips", Number(e.target.value), key)
                                                    }
                                                    InputProps={{
                                                      endAdornment: <InputAdornment position="end">in</InputAdornment>,
                                                    }}
                                                    inputProps={{
                                                      min: 0,
                                                      step: 0.1,
                                                    }}
                                                    fullWidth
                                                  />
                                                </Grid>
                                              </Grid>
                                              <Box display="flex" gap={1}>
                                                <Button
                                                  size="small"
                                                  variant="contained"
                                                  startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                                                  onClick={() => handleItemSave(key)}
                                                  disabled={isSaving}
                                                  sx={{ borderRadius: 1 }}
                                                >
                                                  {isSaving ? 'Saving...' : 'Save'}
                                                </Button>
                                                <Button
                                                  size="small"
                                                  variant="outlined"
                                                  startIcon={<CancelIcon />}
                                                  onClick={() => handleItemCancel(key)}
                                                  disabled={isSaving}
                                                  sx={{ borderRadius: 1 }}
                                                >
                                                  Cancel
                                                </Button>
                                              </Box>
                                            </Box>
                                          </Fade>
                                        ) : (
                                          <Box display="flex" alignItems="center" gap={2}>
                                            <Typography variant="caption" color="text.secondary">
                                              Measurements:
                                            </Typography>
                                            <Chip
                                              label={`C: ${item.customSize.chest}"`}
                                              size="small"
                                              variant="outlined"
                                              sx={{ fontSize: '0.7rem', height: 20 }}
                                            />
                                            <Chip
                                              label={`W: ${item.customSize.waist}"`}
                                              size="small"
                                              variant="outlined"
                                              sx={{ fontSize: '0.7rem', height: 20 }}
                                            />
                                            <Chip
                                              label={`H: ${item.customSize.hips}"`}
                                              size="small"
                                              variant="outlined"
                                              sx={{ fontSize: '0.7rem', height: 20 }}
                                            />
                                          </Box>
                                        )}
                                      </Card>
                                    );
                                  })}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box 
                      py={4} 
                      display="flex" 
                      flexDirection="column" 
                      alignItems="center" 
                      gap={1}
                    >
                      <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        No orders available for this customer
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function CollapsibleCustomerTable() {
  const theme = useTheme();
  // State for customer data, pagination, loading, and error
  const [customers, setCustomers] = React.useState<CustomerType[]>([]);
  const [originalCustomers, setOriginalCustomers] = React.useState<CustomerType[]>([]);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [totalCustomers, setTotalCustomers] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Function to fetch data from your API
  const getCustomers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCustomers({ page: page + 1, limit: rowsPerPage });
      
      // FIX: Map the snake_case keys from the API to camelCase for the component
      const formattedCustomers = data.data.map(customer => ({
        ...customer,
        // Map the snake_case fields to camelCase
        orderCount: customer.order_count,
        lastOrderDate: customer.last_order_date,
      }));
      
      setCustomers(formattedCustomers);
      setOriginalCustomers(formattedCustomers); // Store original data for error recovery
      setTotalCustomers(data.pagination.total_items);
    } catch (err) {
      setError("Failed to fetch customers. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage]);

  // Use effect to fetch data on component mount and when pagination changes
  React.useEffect(() => {
    getCustomers();
  }, [getCustomers]);

  const updateCustomerStatusHandler = async (
    id: string,
    newStatus: CustomerType["status"]
  ) => {
    // Optimistic update - update UI immediately
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );

    try {
      // Use the service function
      const result = await updateCustomerStatus(id, newStatus);
      
      // Update with the response from server (in case server modifies anything)
      if (result.success && result.data) {
        setCustomers((prev) =>
          prev.map((c) => 
            c.id === id 
              ? { 
                  ...c, 
                  status: result.data.status,
                  // Map any additional fields from Supabase response
                  ...(result.data.order_count && { orderCount: result.data.order_count }),
                  ...(result.data.last_order_date && { lastOrderDate: result.data.last_order_date }),
                } 
              : c
          )
        );
        
        // Update original customers data as well
        setOriginalCustomers((prev) =>
          prev.map((c) => 
            c.id === id 
              ? { 
                  ...c, 
                  status: result.data.status,
                  ...(result.data.order_count && { orderCount: result.data.order_count }),
                  ...(result.data.last_order_date && { lastOrderDate: result.data.last_order_date }),
                } 
              : c
          )
        );
      }

      // Show success message
      setSuccessMessage(`Customer status updated to ${statusConfig[newStatus].label.toLowerCase()}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      console.log(`Successfully updated customer ${id} status to ${newStatus}`);
    } catch (error) {
      console.error('Error updating customer status:', error);
      
      // Revert the optimistic update on error
      const originalCustomer = originalCustomers.find(customer => customer.id === id);
      if (originalCustomer) {
        setCustomers((prev) =>
          prev.map((c) => 
            c.id === id ? { ...c, status: originalCustomer.status } : c
          )
        );
      }

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to update customer status. Please try again.';
      setError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleShowMessage = React.useCallback((message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page when rows per page changes
  };

  // Summary statistics
  const summaryStats = React.useMemo(() => {
    const totalRevenue = customers.reduce((sum, customer) => sum + customer.revenue, 0);
    const totalOrders = customers.reduce((sum, customer) => sum + customer.orderCount, 0);
    const activeCustomers = customers.filter(c => c.status === 'active').length;

    return {
      totalRevenue,
      totalOrders,
      activeCustomers,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }, [customers]);

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      {/* Header Section */}
      <Box mb={4}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 700, 
            color: 'text.primary',
            mb: 1,
          }}
        >
          Customer Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your customers, track orders, and update custom measurements
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    ${summaryStats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                  <TrendingUpIcon sx={{ color: 'success.main' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Active Customers
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {summaryStats.activeCustomers}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                  <PersonIcon sx={{ color: 'primary.main' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Orders
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="info.main">
                    {summaryStats.totalOrders}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                  <ShoppingCartIcon sx={{ color: 'info.main' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Avg Order Value
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    ${summaryStats.averageOrderValue.toFixed(0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                  <MoneyIcon sx={{ color: 'warning.main' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Bar */}
      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <TextField
              placeholder="Search customers by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ 
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              sx={{ borderRadius: 1, minWidth: 120 }}
            >
              Filters
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.grey[100], 0.8) }}>
                  <TableCell sx={{ width: 48 }} />
                  <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary' }}>Revenue</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary' }}>Orders</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary' }}>Last Order</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: rowsPerPage }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton variant="circular" width={32} height={32} /></TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Skeleton variant="circular" width={32} height={32} />
                          <Box>
                            <Skeleton variant="text" width={120} height={20} />
                            <Skeleton variant="text" width={80} height={16} />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Skeleton variant="text" width={150} /></TableCell>
                      <TableCell><Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell align="right"><Skeleton variant="text" width={80} /></TableCell>
                      <TableCell align="right"><Skeleton variant="text" width={40} /></TableCell>
                      <TableCell align="right"><Skeleton variant="text" width={100} /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box py={4} display="flex" flexDirection="column" alignItems="center" gap={2}>
                        <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />
                        <Alert severity="error" sx={{ borderRadius: 2, maxWidth: 400 }}>
                          {error}
                        </Alert>
                        <Button
                          variant="outlined"
                          onClick={getCustomers}
                          sx={{ borderRadius: 1 }}
                        >
                          Try Again
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box py={6} display="flex" flexDirection="column" alignItems="center" gap={2}>
                        <PersonIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                        <Typography variant="h6" color="text.secondary">
                          No customers found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                          {searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding your first customer'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers
                    .filter(customer => 
                      !searchQuery || 
                      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((customer) => (
                      <Row
                        key={customer.id}
                        row={customer}
                        onStatusUpdate={updateCustomerStatusHandler}
                        onShowMessage={handleShowMessage}
                      />
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Enhanced Pagination */}
          <Box 
            sx={{ 
              borderTop: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.grey[50], 0.5),
            }}
          >
            <TablePagination
              component="div"
              count={totalCustomers}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              showFirstButton
              showLastButton
              sx={{
                '& .MuiTablePagination-toolbar': {
                  paddingLeft: 3,
                  paddingRight: 3,
                },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontWeight: 500,
                  color: 'text.primary',
                },
                '& .MuiTablePagination-select': {
                  fontWeight: 600,
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
      
      {/* Footer Information */}
      <Box mt={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary">
          Customer Management Dashboard
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Showing {Math.min((page * rowsPerPage) + 1, totalCustomers)} - {Math.min((page + 1) * rowsPerPage, totalCustomers)} of {totalCustomers} customers
        </Typography>
      </Box>
      
      {/* Success and Error Snackbars */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSuccessMessage(null)} 
          severity="success" 
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity="error" 
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}