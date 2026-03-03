.PHONY: integration\:start integration\:run integration\:test integration\:stop integration\:clean

integration\:start:
	@echo "Starting Docker services..."
	docker compose up -d
	@echo "Running Invoice Ninja init script..."
	env bash scripts/init-invoiceninja.sh

integration\:run:
	npm run test:integration

integration\:test:
	$(MAKE) 'integration:start'
	$(MAKE) 'integration:run'; status=$$?; $(MAKE) 'integration:stop'; exit $$status

integration\:stop:
	docker compose down

integration\:clean:
	docker compose down -v
	rm -f docker/integration.env
	@echo "Cleaned up Docker volumes and integration env file."
