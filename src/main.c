#include <pebble.h>
  
#define KEY_TEMPERATURE 0
#define KEY_CONDITIONS 1
#define KEY_SUNRISE 2
#define KEY_SUNSET 3
#define KEY_MOONPHASE 4
  
static Window *s_main_window;
static TextLayer *s_time_layer;
static TextLayer *s_weather_layer;
static TextLayer *s_sun_times_layer;
static BitmapLayer *s_icon_layer;
static BitmapLayer *s_moon_icon_layer;

static bool invert = false;
static GColor foregroundColour = GColorWhite;
static GColor backgroundColour = GColorBlack;

static GFont s_weather_font;
static GBitmap *icon_bitmap = NULL;
static GBitmap *moon_icon_bitmap = NULL;

static const uint32_t MOON_ICONS[] = {
  RESOURCE_ID_IMAGE_MOON_0,
  RESOURCE_ID_IMAGE_MOON_1,
  RESOURCE_ID_IMAGE_MOON_2,
  RESOURCE_ID_IMAGE_MOON_3,
  RESOURCE_ID_IMAGE_MOON_4,
  RESOURCE_ID_IMAGE_MOON_5,
  RESOURCE_ID_IMAGE_MOON_6,
  RESOURCE_ID_IMAGE_MOON_7
};

static const uint32_t WEATHER_ICONS[] = {
  RESOURCE_ID_WEATHER_0,
  RESOURCE_ID_WEATHER_1,
  RESOURCE_ID_WEATHER_2,
  RESOURCE_ID_WEATHER_3,
  RESOURCE_ID_WEATHER_4,
  RESOURCE_ID_WEATHER_5,
  RESOURCE_ID_WEATHER_6,
  RESOURCE_ID_WEATHER_7,
  RESOURCE_ID_WEATHER_8,
  RESOURCE_ID_WEATHER_9,
  RESOURCE_ID_WEATHER_10,
  RESOURCE_ID_WEATHER_11,
  RESOURCE_ID_WEATHER_12  
};

static void update_time(){
  // Get a tm structure
  time_t temp = time(NULL);
  struct tm *tick_time = localtime(&temp);
  
  // Create a long-lived buffer
  static char buffer[] = "00:00";
  
  // Write the current hours and minutes into the buffer
  if(clock_is_24h_style() == true) {
    // Use 24 hour format
    strftime(buffer, sizeof("00:00"), "%H:%M", tick_time);
  } else {
    // Use 12 hour format
    strftime(buffer, sizeof("00:00"), "%I:%M", tick_time);
  }
             
  // Display this time on the TextLayer
  text_layer_set_text(s_time_layer, buffer);
}

static void updateColours(){
  window_set_background_color(s_main_window, backgroundColour);
  text_layer_set_text_color(s_sun_times_layer, foregroundColour);
  text_layer_set_text_color(s_time_layer, foregroundColour);
  text_layer_set_text_color(s_weather_layer, foregroundColour);
}

static void invertText(){
  if (invert) {
    foregroundColour = GColorBlack;
    backgroundColour = GColorWhite;
  } else {
    foregroundColour = GColorWhite;
    backgroundColour = GColorBlack;
  }
  updateColours();
}

static void handle_accel_tap(AccelAxisType axis, int32_t direction){
  //invert = !invert;
  //invertText();
}
             
static void tick_handler(struct tm *tick_time, TimeUnits units_changed){
  update_time();
  // Get weather update every 30 minutes
  if(tick_time->tm_min % 30 == 0) {
    // Begin dictionary
    DictionaryIterator *iter;
    app_message_outbox_begin(&iter);
    
    // Add a key-value pair
    dict_write_uint8(iter, 0, 0);
    
    // Send the message!
    app_message_outbox_send();
  }
}

static void main_window_load(Window *window){
  // Set up main window
  window_set_background_color(s_main_window, backgroundColour);
  
  // Create sun times TextLayer
  s_sun_times_layer = text_layer_create(GRect(5,5,104,35));
  text_layer_set_background_color(s_sun_times_layer, GColorClear);
  text_layer_set_text_color(s_sun_times_layer,foregroundColour);
  layer_add_child(window_get_root_layer(window), text_layer_get_layer(s_sun_times_layer));
  
  // Create moon icon layer
  s_moon_icon_layer = bitmap_layer_create(GRect(109,5,25,25));
  layer_add_child(window_get_root_layer(window), bitmap_layer_get_layer(s_moon_icon_layer));
  
  // Create time TextLayer
  s_time_layer = text_layer_create(GRect(0, 55, 144,50));
  text_layer_set_background_color(s_time_layer, GColorClear);
  text_layer_set_text_color(s_time_layer, foregroundColour);

  // No longer required as update_time() called below
  // text_layer_set_text(s_time_layer, "00:00");
  
  // Improve the layout to be more like a watchface
  text_layer_set_font(s_time_layer, fonts_get_system_font(FONT_KEY_BITHAM_42_BOLD));
  text_layer_set_text_alignment(s_time_layer, GTextAlignmentCenter);
  
  // Add it as a child layer to the Window's root layer
  layer_add_child(window_get_root_layer(window), text_layer_get_layer(s_time_layer));
  
  // Create temperature Layer
  s_weather_layer = text_layer_create(GRect(35, 138, 133, 25));
  text_layer_set_background_color(s_weather_layer, GColorClear);
  text_layer_set_text_color(s_weather_layer, foregroundColour);
  //text_layer_set_text_alignment(s_weather_layer, GTextAlignmentCenter);
  
  // Create custom font, apply it and add to Window
  s_weather_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FONT_PERFECT_DOS_20));
  text_layer_set_text(s_weather_layer, "Loading...");
  text_layer_set_font(s_weather_layer, s_weather_font);
  //text_layer_set_font(s_sun_times_layer, s_weather_font);
  layer_add_child(window_get_root_layer(window), text_layer_get_layer(s_weather_layer));
  
  // Add weather icon layer
  s_icon_layer = bitmap_layer_create(GRect(5,138,25,25));
  layer_add_child(window_get_root_layer(window), bitmap_layer_get_layer(s_icon_layer));
    
  // Make sure the time is displayed from the start
  update_time();
}

static void main_window_unload(Window *window){
  // Destroy sun_times layer
  text_layer_destroy(s_sun_times_layer);
  
  // Destroy moon_icon layer
  gbitmap_destroy(moon_icon_bitmap);
  bitmap_layer_destroy(s_moon_icon_layer);
  
  // Destroy TextLayer
  text_layer_destroy(s_time_layer);
  
  // Destroy weather elements
  text_layer_destroy(s_weather_layer);
  fonts_unload_custom_font(s_weather_font);

  // Destroy icon layer
  gbitmap_destroy(icon_bitmap);
  bitmap_layer_destroy(s_icon_layer);
}

static void inbox_received_callback(DictionaryIterator *iterator, void *content){
  static char temperature_buffer[8];
  static char weather_layer_buffer[32];
  static char sunrise_buffer[8];
  static char sunset_buffer[8];
  static char sun_times_layer_buffer[32];
  
  // Read first item
  Tuple *t = dict_read_first(iterator);
  
  // For all items
  while(t != NULL) {
    // Which key was received?
    switch(t->key){
      case KEY_TEMPERATURE:
        snprintf(temperature_buffer, sizeof(temperature_buffer), "%sC",
                t->value->cstring);
        break;
      case KEY_CONDITIONS:
        if (icon_bitmap) {
          gbitmap_destroy(icon_bitmap);
        }
        icon_bitmap = gbitmap_create_with_resource(WEATHER_ICONS[t->value->uint8]);
        bitmap_layer_set_bitmap(s_icon_layer, icon_bitmap);
        break;
      case KEY_SUNRISE:
        snprintf(sunrise_buffer, sizeof(sunrise_buffer), "%s", t->value->cstring);
        break;
      case KEY_SUNSET:
        snprintf(sunset_buffer, sizeof(sunset_buffer), "%s", t->value->cstring);
        break;
      case KEY_MOONPHASE:
        if (moon_icon_bitmap) {
          gbitmap_destroy(moon_icon_bitmap);
        }
        moon_icon_bitmap = gbitmap_create_with_resource(MOON_ICONS[t->value->uint8]);
        bitmap_layer_set_bitmap(s_moon_icon_layer, moon_icon_bitmap);
        break;
      default:
        APP_LOG(APP_LOG_LEVEL_ERROR, "key %d not recognized!", (int) t->key);
        break;
    }
    
    // Look for next item
    t = dict_read_next(iterator);
  }
  
  // Assemble full string and display
  //snprintf(weather_layer_buffer, sizeof(weather_layer_buffer), "%s, %s", temperature_buffer, conditions_buffer);
  snprintf(weather_layer_buffer, sizeof(weather_layer_buffer), "%s", temperature_buffer);
  text_layer_set_text(s_weather_layer, weather_layer_buffer);
  snprintf(sun_times_layer_buffer, sizeof(sun_times_layer_buffer), "Sunrise:%s Sunset:%s", sunrise_buffer, sunset_buffer);
  text_layer_set_overflow_mode(s_sun_times_layer, GTextOverflowModeWordWrap);
  text_layer_set_text(s_sun_times_layer, sun_times_layer_buffer);
}

static void inbox_dropped_callback(AppMessageResult reason, void *content){
  APP_LOG(APP_LOG_LEVEL_ERROR, "Message dropped!");
}

static void outbox_failed_callback(DictionaryIterator *iterator, AppMessageResult reason, void *content){
  APP_LOG(APP_LOG_LEVEL_ERROR, "Outbox send failed!");
}

static void outbox_sent_callback(DictionaryIterator *iterator, void *content){
  APP_LOG(APP_LOG_LEVEL_INFO, "Outbox send success!");
}

static void init() {
  
  // Register with TickTimerService
  tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);
  
  // Register with AccelTapService
  accel_tap_service_subscribe(handle_accel_tap);
  
  // Register callbacks
  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_register_outbox_failed(outbox_failed_callback);
  app_message_register_outbox_sent(outbox_sent_callback);
  
  // Open AppMessage
  app_message_open(app_message_inbox_size_maximum(), app_message_outbox_size_maximum());
  
  // Create main Window element and assign to pointer
  s_main_window = window_create();
  
  // Set handlers to manage the elements inside the Window
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = main_window_load,
    .unload = main_window_unload
  });
  
// Show the Window on the watch, with animated=true
  window_stack_push (s_main_window, true);
}

static void deinit() {
  // Destroy Window
  window_destroy(s_main_window);
  
  // Unsubscribe from services
  accel_tap_service_unsubscribe();
  tick_timer_service_unsubscribe();
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}