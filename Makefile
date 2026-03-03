.PHONY: integration\:start integration\:run integration\:test integration\:stop integration\:clean

integration\:start:
	@echo "Starting Docker services..."
	docker compose up -d
	@if [ ! -f docker/integration.env ]; then \
		echo "First run — initializing Invoice Ninja..."; \
		env bash scripts/init-invoiceninja.sh; \
	else \
		echo "Integration environment already initialized, skipping init."; \
	fi

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
