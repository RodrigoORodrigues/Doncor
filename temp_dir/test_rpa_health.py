#!/usr/bin/env python3
"""Test script to verify RPA and API health endpoints."""

import requests
import sys
import time

def test_endpoint(url, name):
    """Test if an endpoint is responding."""
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            print(f"✓ {name}: OK (200)")
            return True
        else:
            print(f"✗ {name}: Error ({resp.status_code})")
            return False
    except requests.exceptions.ConnectionError:
        print(f"✗ {name}: Connection failed")
        return False
    except requests.exceptions.Timeout:
        print(f"✗ {name}: Timeout")
        return False
    except Exception as e:
        print(f"✗ {name}: {e}")
        return False

def main():
    print("Testing Doncor services health...\n")

    # Test API main service
    api_health = test_endpoint("http://localhost:8000/health", "API Health")
    api_root = test_endpoint("http://localhost:8000/api/", "API Root")

    # Test RPA service
    rpa_health = test_endpoint("http://localhost:8001/health", "RPA Health")
    rpa_root = test_endpoint("http://localhost:8001/", "RPA Root")

    print("\nSummary:")
    services_ok = sum([api_health, api_root, rpa_health, rpa_root])
    print(f"{services_ok}/4 endpoints responding")

    if services_ok >= 2:
        print("\n✓ Services appear to be running")
        return 0
    else:
        print("\n✗ Most services are not responding")
        return 1

if __name__ == "__main__":
    sys.exit(main())
