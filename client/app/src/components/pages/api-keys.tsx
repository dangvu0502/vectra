import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/ui/app-layout';
import { FC } from 'react';

export const ApiKeysPage: FC = () => {
  return (
    <AppLayout>
          <h1 className="text-2xl font-semibold text-primary transition-colors duration-200">API keys</h1>
          
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Manage your API keys for accessing the vectra API</p>
            
            <div className="flex gap-3">
              <Button 
                variant="default" 
                size="sm"
                className="gap-2 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                Create new API key
              </Button>
            </div>
          </div>
          
          <div className="border rounded-md p-4 bg-card/50">
            <p className="text-sm text-muted-foreground">
              Your API keys are listed below. The API key is only visible and can be copied once at creation. 
              Save it securely. Do not share your API key with others, or expose it in the browser or other client-side code. 
            </p>
          </div>
          
          <div className="flex-1 transition-all duration-200 ease-in-out">
            <div className="border rounded-md overflow-hidden shadow-sm transition-shadow duration-200 hover:shadow-md bg-card">
              <div className="p-6 text-center text-muted-foreground">
                No API key, you can Create new API key.
              </div>
            </div>
          </div>
    </AppLayout>
  );
};