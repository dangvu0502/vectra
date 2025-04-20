import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/ui/app-layout';
import { FC, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useApiKeysQuery } from '@/hooks/use-api-keys-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export const ApiKeysPage: FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [newKeyName, setNewKeyName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    apiKeys,
    isLoadingApiKeys,
    createApiKey,
    isCreatingApiKey,
    deleteApiKey,
    isDeletingApiKey,
  } = useApiKeysQuery();

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    try {
      const result = await createApiKey({ name: newKeyName.trim() });
      setNewKey(result.key);
      setNewKeyName('');
      setIsDialogOpen(false);
      setError(null);
    } catch {
      setError('Failed to create API key');
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await deleteApiKey(id);
      setError(null);
    } catch {
      setError('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderContent = () => {
    if (isAuthLoading || isLoadingApiKeys) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      );
    }

    return (
      <>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-primary transition-colors duration-200">API keys</h1>
            <p className="text-muted-foreground">Manage your API keys for accessing the vectra API</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                size="sm"
                className="gap-2 shadow-sm hover:shadow-md transition-shadow duration-200"
                disabled={!user}
              >
                Create new API key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Enter API key name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
                <Button 
                  onClick={handleCreateKey}
                  disabled={isCreatingApiKey}
                  className="w-full"
                >
                  Create Key
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {error && (
          <div className="border rounded-md p-4 bg-destructive/10 text-destructive">
            {error}
          </div>
        )}
        
        <div className="border rounded-md p-4 bg-card/50">
          <p className="text-sm text-muted-foreground">
            Your API keys are listed below. The API key is only visible and can be copied once at creation. 
            Save it securely. Do not share your API key with others, or expose it in the browser or other client-side code. 
          </p>
        </div>
        
        <div className="flex-1 transition-all duration-200 ease-in-out">
          <div className="border rounded-md overflow-hidden shadow-sm transition-shadow duration-200 hover:shadow-md bg-card">
            {!user ? (
              <div className="p-6 text-center text-muted-foreground">
                Please log in to view your API keys.
              </div>
            ) : apiKeys?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No API keys found. Create a new API key to get started.
              </div>
            ) : (
              <div className="divide-y">
                {apiKeys?.map((key) => (
                  <div key={key.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{key.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(key.created_at).toLocaleDateString()}
                        </p>
                        {key.last_used_at && (
                          <p className="text-sm text-muted-foreground">
                            Last used: {new Date(key.last_used_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteKey(key.id)}
                        disabled={isDeletingApiKey}
                      >
                        Delete
                      </Button>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                          {key.key}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(key.key)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {newKey && (
          <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Your new API key has been created. Please copy it now as you won't be able to see it again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                    {newKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newKey)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
        {renderContent()}
      </div>
    </AppLayout>
  );
};