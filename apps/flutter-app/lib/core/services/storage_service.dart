import 'package:hive/hive.dart';

class StorageService {
  Future<Box> _openBox(String name) async {
    return Hive.box(name);
  }

  // ── Generic helpers ──
  Future<void> save(String boxName, String key, dynamic value) async {
    final box = await _openBox(boxName);
    await box.put(key, value);
  }

  Future<dynamic> get(String boxName, String key) async {
    final box = await _openBox(boxName);
    return box.get(key);
  }

  Future<void> delete(String boxName, String key) async {
    final box = await _openBox(boxName);
    await box.delete(key);
  }

  Future<void> clear(String boxName) async {
    final box = await _openBox(boxName);
    await box.clear();
  }

  // ── Settings ──
  Future<void> saveSetting(String key, dynamic value) async {
    await save('settings', key, value);
  }

  Future<dynamic> getSetting(String key) async {
    return get('settings', key);
  }

  // ── Categories cache ──
  Future<void> cacheCategories(List<Map<String, dynamic>> categories) async {
    final box = await _openBox('categories');
    await box.put('all', categories);
  }

  Future<List<Map<String, dynamic>>?> getCachedCategories() async {
    final box = await _openBox('categories');
    final data = box.get('all');
    if (data == null) return null;
    return List<Map<String, dynamic>>.from(data);
  }

  // ── Pending sync queue ──
  Future<void> addToPendingSync(Map<String, dynamic> record) async {
    final box = await _openBox('pending_sync');
    final pending = List<Map<String, dynamic>>.from(box.get('queue', defaultValue: []));
    pending.add(record);
    await box.put('queue', pending);
  }

  Future<List<Map<String, dynamic>>> getPendingSync() async {
    final box = await _openBox('pending_sync');
    return List<Map<String, dynamic>>.from(box.get('queue', defaultValue: []));
  }

  Future<void> clearPendingSync() async {
    final box = await _openBox('pending_sync');
    await box.put('queue', <Map<String, dynamic>>[]);
  }
}
