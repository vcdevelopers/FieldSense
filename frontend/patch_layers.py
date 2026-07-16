import re

with open('src/components/tracking/LiveTrackingMap.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the old Map Theme select from the floating overlay
old_theme_block = '''              <div>
                <p className="text-xs text-muted-foreground mb-1">Map Theme</p>
                <Select value={mapTheme} onValueChange={setMapTheme}>
                  <SelectTrigger className="bg-background w-full h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="satellite">Satellite</SelectItem>
                    <SelectItem value="logicon-light">Logicon Light Theme</SelectItem>
                    <SelectItem value="logicon-dark">Logicon Dark Theme</SelectItem>
                  </SelectContent>
                </Select>
              </div>'''

if old_theme_block in content:
    content = content.replace(old_theme_block, "")

# 2. Add the Layers Popover Button and the map layers inside GoogleMap
# Find where the Floating Overlay Card closes:
card_end_search = '          </CardContent>\n        </Card>\n'

popover_code = '''
        {/* Map Layers Menu (Google Maps style) */}
        <div className="absolute top-4 right-4 z-20">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="icon" className="w-10 h-10 rounded-xl shadow-xl bg-card/95 hover:bg-muted/80 border border-border transition-all">
                <Layers className="w-5 h-5 text-primary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={10} className="w-72 p-4 rounded-2xl shadow-2xl border-border bg-card/95 backdrop-blur-xl">
              
              <div className="mb-4">
                <h4 className="font-semibold mb-3 text-sm flex items-center justify-between">Map details</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div 
                    onClick={() => setShowTransit(!showTransit)}
                    className="flex flex-col items-center justify-center gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showTransit ? 'bg-primary/20 border-2 border-primary ring-2 ring-primary/30' : 'bg-muted border border-border group-hover:border-primary/50'}`}>
                      <Bus className={`w-6 h-6 ${showTransit ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-[11px] font-medium ${showTransit ? 'text-primary' : 'text-muted-foreground'}`}>Transit</span>
                  </div>

                  <div 
                    onClick={() => setShowTraffic(!showTraffic)}
                    className="flex flex-col items-center justify-center gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showTraffic ? 'bg-orange-500/20 border-2 border-orange-500 ring-2 ring-orange-500/30' : 'bg-muted border border-border group-hover:border-orange-500/50'}`}>
                      <Car className={`w-6 h-6 ${showTraffic ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-[11px] font-medium ${showTraffic ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>Traffic</span>
                  </div>

                  <div 
                    onClick={() => setShowBiking(!showBiking)}
                    className="flex flex-col items-center justify-center gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showBiking ? 'bg-green-500/20 border-2 border-green-500 ring-2 ring-green-500/30' : 'bg-muted border border-border group-hover:border-green-500/50'}`}>
                      <Bike className={`w-6 h-6 ${showBiking ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-[11px] font-medium ${showBiking ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>Biking</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-border my-4" />

              <div>
                <h4 className="font-semibold mb-3 text-sm">Map type</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div 
                    onClick={() => setMapTheme('standard')}
                    className="flex flex-col items-center justify-start gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl overflow-hidden transition-all flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${mapTheme === 'standard' ? 'border-2 border-primary ring-2 ring-primary/30' : 'border border-border group-hover:border-primary/50'}`}>
                      <Map className={`w-6 h-6 ${mapTheme === 'standard' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-[10px] text-center font-medium ${mapTheme === 'standard' ? 'text-primary' : 'text-muted-foreground'}`}>Standard</span>
                  </div>

                  <div 
                    onClick={() => setMapTheme('satellite')}
                    className="flex flex-col items-center justify-start gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl overflow-hidden transition-all flex items-center justify-center bg-green-900/20 ${mapTheme === 'satellite' ? 'border-2 border-primary ring-2 ring-primary/30' : 'border border-border group-hover:border-primary/50'}`}>
                      <svg className={`w-6 h-6 ${mapTheme === 'satellite' ? 'text-primary' : 'text-muted-foreground'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>
                    </div>
                    <span className={`text-[10px] text-center font-medium ${mapTheme === 'satellite' ? 'text-primary' : 'text-muted-foreground'}`}>Satellite</span>
                  </div>

                  <div 
                    onClick={() => setMapTheme('logicon-light')}
                    className="flex flex-col items-center justify-start gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl overflow-hidden transition-all flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 ${mapTheme === 'logicon-light' ? 'border-2 border-primary ring-2 ring-primary/30' : 'border border-border group-hover:border-primary/50'}`}>
                      <Sun className={`w-6 h-6 ${mapTheme === 'logicon-light' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-[10px] text-center font-medium leading-tight ${mapTheme === 'logicon-light' ? 'text-primary' : 'text-muted-foreground'}`}>Logicon Light</span>
                  </div>

                  <div 
                    onClick={() => setMapTheme('logicon-dark')}
                    className="flex flex-col items-center justify-start gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl overflow-hidden transition-all flex items-center justify-center bg-slate-900 ${mapTheme === 'logicon-dark' ? 'border-2 border-primary ring-2 ring-primary/30' : 'border border-border group-hover:border-primary/50'}`}>
                      <Moon className={`w-6 h-6 ${mapTheme === 'logicon-dark' ? 'text-primary' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[10px] text-center font-medium leading-tight ${mapTheme === 'logicon-dark' ? 'text-primary' : 'text-muted-foreground'}`}>Logicon Dark</span>
                  </div>
                </div>
              </div>

            </PopoverContent>
          </Popover>
        </div>
'''

if card_end_search in content:
    content = content.replace(card_end_search, card_end_search + popover_code)

# 3. Add the Map Layers inside the GoogleMap tags
layers_code = '''
              {/* Optional Map Layers */}
              {showTraffic && <TrafficLayer />}
              {showTransit && <TransitLayer />}
              {showBiking && <BicyclingLayer />}
'''

map_inner_search = '''            <GoogleMap
              mapContainerStyle={containerStyle}
              center={defaultCenter}
              zoom={11}
              onLoad={onMapLoad}
              options={mapOptions}
            >'''

if map_inner_search in content:
    content = content.replace(map_inner_search, map_inner_search + layers_code)

with open('src/components/tracking/LiveTrackingMap.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Layers UI applied successfully!")
