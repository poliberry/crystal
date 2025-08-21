"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Users, Mic, Volume2, Loader2 } from "lucide-react";
import { type Channel, type Server } from "@prisma/client";

interface StageJoinScreenProps {
  channel: Channel;
  server: Server;
  onJoin?: () => void;
  isConnecting?: boolean;
}

interface StageInfo {
  channel: {
    id: string;
    name: string;
    type: string;
  };
  server: {
    id: string;
    name: string;
  };
  connectedUsers: number;
  speakers: number;
  audience: number;
  isConnected: boolean;
}

export const StageJoinScreen = ({ channel, server, onJoin, isConnecting = false }: StageJoinScreenProps) => {
  const [stageInfo, setStageInfo] = useState<StageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchStageInfo = async () => {
      try {
        const response = await fetch(`/api/channels/${channel.id}/info`);
        const data = await response.json();
        setStageInfo(data);
      } catch (error) {
        console.error("Failed to fetch stage info:", error);
        // Set default values if fetch fails
        setStageInfo({
          channel: {
            id: channel.id,
            name: channel.name,
            type: channel.type,
          },
          server: {
            id: server.id,
            name: server.name,
          },
          connectedUsers: 0,
          speakers: 0,
          audience: 0,
          isConnected: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStageInfo();

    // Refresh stage info every 5 seconds
    const interval = setInterval(fetchStageInfo, 5000);
    return () => clearInterval(interval);
  }, [channel.id, channel.name, channel.type, server.id, server.name]);

  const handleJoin = async () => {
    if (!onJoin) return;
    
    setJoining(true);
    try {
      await onJoin();
    } catch (error) {
      console.error("Failed to join stage:", error);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading stage information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full p-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Radio className="h-6 w-6 text-primary" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <Badge variant="secondary">LIVE</Badge>
            </div>
          </div>
          <CardTitle className="text-2xl">{stageInfo?.channel.name}</CardTitle>
          <CardDescription>
            Stage channel in {stageInfo?.server.name}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Activity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Mic className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-muted-foreground">Speakers</span>
              </div>
              <p className="text-2xl font-bold">{stageInfo?.speakers || 0}</p>
            </div>

            <div className="text-center p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">Audience</span>
              </div>
              <p className="text-2xl font-bold">{stageInfo?.audience || 0}</p>
            </div>
          </div>

          {/* Total participants */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {stageInfo?.connectedUsers || 0} {(stageInfo?.connectedUsers || 0) === 1 ? 'person' : 'people'} in this stage
            </p>
          </div>

          {/* Stage Description */}
          <div className="text-center space-y-2">
            <h3 className="font-semibold flex items-center justify-center gap-2">
              <Volume2 className="h-4 w-4" />
              About Stage Channels
            </h3>
            <p className="text-sm text-muted-foreground">
              Stage channels are designed for live audio conversations. You'll join as an audience member and can request to speak if you have permission.
            </p>
          </div>

          {/* Join Button or Connecting State */}
          {isConnecting ? (
            <div className="w-full p-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Connecting to stage...</p>
            </div>
          ) : onJoin ? (
            <Button 
              onClick={handleJoin} 
              disabled={joining}
              className="w-full" 
              size="lg"
            >
              {joining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Radio className="mr-2 h-4 w-4" />
                  Join Stage
                </>
              )}
            </Button>
          ) : (
            <div className="w-full p-4 text-center">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          )}

          {/* Note about permissions */}
          {!isConnecting && (
            <p className="text-xs text-muted-foreground text-center">
              You'll join as an audience member. Use "Request to Speak" to become a speaker.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
